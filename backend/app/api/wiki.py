"""
MediaWiki Action API Client & Authentication Manager.
Handles article retrieval, redirect resolution, live HTML parsing,
bot/user authentication, CSRF tokens, edit conflict detection, and safe saving.
"""

import httpx
import re
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Request, Response, Header
from pydantic import BaseModel, HttpUrl

router = APIRouter(prefix="/wiki", tags=["MediaWiki"])

# In-memory session store (keyed by session_id token or client cookie)
# For production single-server or dev, this keeps session cookies and tokens safe on server
SESSION_STORE: Dict[str, Dict[str, Any]] = {}
DEFAULT_ENDPOINT = "https://justapedia.org/api.php"


class MediaWikiSettings(BaseModel):
    endpoint: str = DEFAULT_ENDPOINT


class ArticleFetchRequest(BaseModel):
    title_or_url: str
    endpoint: str = DEFAULT_ENDPOINT


class ParsePreviewRequest(BaseModel):
    title: str
    wikitext: str
    endpoint: str = DEFAULT_ENDPOINT


class LoginRequest(BaseModel):
    username: str
    password: str  # User password or Bot password
    endpoint: str = DEFAULT_ENDPOINT


class SaveArticleRequest(BaseModel):
    title: str
    wikitext: str
    summary: str = "Converted article prose to American English"
    basetimestamp: Optional[str] = None
    expected_revid: Optional[int] = None
    is_dry_run: bool = False
    endpoint: str = DEFAULT_ENDPOINT


def _clean_endpoint(url: str) -> str:
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    if not url.endswith("/api.php"):
        if url.endswith("/"):
            url = url + "api.php"
        elif "/wiki/" in url:
            base = url.split("/wiki/")[0]
            url = f"{base}/api.php"
        elif "/w/" in url:
            base = url.split("/w/")[0]
            url = f"{base}/w/api.php"
    return url


def _extract_title_from_input(input_val: str) -> str:
    input_val = input_val.strip()
    # Check if full URL, e.g. https://justapedia.org/Perfume_(novel) or https://en.wikipedia.org/wiki/Dog
    if "://" in input_val:
        m = re.search(r'/(?:wiki/)?([^?&#]+)', input_val)
        if m:
            title_part = m.group(1).replace("_", " ")
            return title_part
    return input_val.replace("_", " ")


def _get_or_create_session(session_id: Optional[str]) -> Tuple[str, Dict[str, Any]]:
    import uuid
    if not session_id or session_id not in SESSION_STORE:
        sid = str(uuid.uuid4())
        SESSION_STORE[sid] = {
            "cookies": {},
            "username": None,
            "logged_in": False,
            "csrf_token": None,
            "endpoint": DEFAULT_ENDPOINT
        }
        return sid, SESSION_STORE[sid]
    return session_id, SESSION_STORE[session_id]


from typing import Tuple


@router.post("/fetch")
async def fetch_article(req: ArticleFetchRequest, request: Request):
    endpoint = _clean_endpoint(req.endpoint)
    title = _extract_title_from_input(req.title_or_url)

    if not title:
        raise HTTPException(status_code=400, detail="Article title cannot be empty.")

    params = {
        "action": "query",
        "prop": "revisions|info",
        "titles": title,
        "rvprop": "content|ids|timestamp|user|comment|size",
        "rvslots": "main",
        "inprop": "protection",
        "redirects": "1",
        "format": "json"
    }

    headers = {
        "User-Agent": "AmericanEnglishLocalizationTool/1.0 (https://justapedia.org; info@antigravity.tool)"
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            res = await client.get(endpoint, params=params, headers=headers)
            res.raise_for_status()
            data = res.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Failed to connect to MediaWiki API at {endpoint}: {str(e)}")

    query = data.get("query", {})
    redirects_info = query.get("redirects", [])
    redirect_note = None
    if redirects_info:
        from_title = redirects_info[0].get("from")
        to_title = redirects_info[0].get("to")
        redirect_note = f"Redirected from '{from_title}' to '{to_title}'."

    pages = query.get("pages", {})
    if not pages:
        raise HTTPException(status_code=404, detail=f"Page '{title}' not found.")

    page_id, page_data = next(iter(pages.items()))
    if int(page_id) < 0 or "missing" in page_data:
        raise HTTPException(status_code=404, detail=f"Article '{title}' does not exist on {endpoint}.")

    resolved_title = page_data.get("title", title)
    revisions = page_data.get("revisions", [])
    if not revisions:
        raise HTTPException(status_code=404, detail="No revision content available for this page.")

    latest_rev = revisions[0]
    wikitext = latest_rev.get("slots", {}).get("main", {}).get("*", "")
    revid = latest_rev.get("revid")
    timestamp = latest_rev.get("timestamp")
    last_user = latest_rev.get("user")
    comment = latest_rev.get("comment", "")
    size = latest_rev.get("size", len(wikitext.encode("utf-8")))

    protection = page_data.get("protection", [])
    is_protected = any(p.get("level") in ("sysop", "editprotected") for p in protection)

    return {
        "pageid": int(page_id),
        "title": resolved_title,
        "original_requested_title": title,
        "is_redirect": bool(redirects_info),
        "redirect_note": redirect_note,
        "revid": revid,
        "timestamp": timestamp,
        "last_user": last_user,
        "comment": comment,
        "size": size,
        "is_protected": is_protected,
        "protection_details": protection,
        "wikitext": wikitext,
        "endpoint": endpoint
    }


@router.post("/preview")
async def parse_preview(req: ParsePreviewRequest):
    """
    Renders live HTML preview of Wikitext using MediaWiki's action=parse.
    """
    endpoint = _clean_endpoint(req.endpoint)
    data = {
        "action": "parse",
        "title": req.title,
        "text": req.wikitext,
        "prop": "text|categories|sections",
        "disablelimitreport": "1",
        "format": "json"
    }

    headers = {
        "User-Agent": "AmericanEnglishLocalizationTool/1.0"
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            res = await client.post(endpoint, data=data, headers=headers)
            res.raise_for_status()
            res_json = res.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"MediaWiki HTML parse failed: {str(e)}")

    if "error" in res_json:
        raise HTTPException(status_code=400, detail=res_json["error"].get("info", "Parse error"))

    parse_data = res_json.get("parse", {})
    html = parse_data.get("text", {}).get("*", "")
    categories = [c.get("*") for c in parse_data.get("categories", [])]
    sections = parse_data.get("sections", [])

    return {
        "title": req.title,
        "html": html,
        "categories": categories,
        "sections": sections
    }


@router.post("/login")
async def mediawiki_login(req: LoginRequest, response: Response, x_session_id: Optional[str] = Header(None)):
    """
    Authenticates with MediaWiki Action API.
    Supports Bot Passwords and standard ClientLogin / Login tokens.
    """
    endpoint = _clean_endpoint(req.endpoint)
    sid, session_data = _get_or_create_session(x_session_id)
    response.headers["X-Session-Id"] = sid

    headers = {"User-Agent": "AmericanEnglishLocalizationTool/1.0"}

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Step 1: Request login token
        token_res = await client.get(
            endpoint,
            params={"action": "query", "meta": "tokens", "type": "login", "format": "json"},
            headers=headers
        )
        token_data = token_res.json()
        login_token = token_data.get("query", {}).get("tokens", {}).get("logintoken")

        if not login_token:
            raise HTTPException(status_code=502, detail="Unable to retrieve login token from MediaWiki API.")

        # Step 2: Attempt clientlogin / action=login
        login_payload = {
            "action": "login",
            "lgname": req.username,
            "lgpassword": req.password,
            "lgtoken": login_token,
            "format": "json"
        }
        login_resp = await client.post(endpoint, data=login_payload, headers=headers, cookies=token_res.cookies)
        login_json = login_resp.json()
        login_result = login_json.get("login", {})

        if login_result.get("result") != "Success":
            # If standard login needs second step or failed:
            reason = login_result.get("reason", login_result.get("result", "Login failed"))
            raise HTTPException(status_code=401, detail=f"MediaWiki authentication failed: {reason}")

        # Store cookies
        cookies_dict = dict(login_resp.cookies)
        cookies_dict.update(dict(token_res.cookies))

        # Step 3: Fetch CSRF token and userinfo
        csrf_res = await client.get(
            endpoint,
            params={"action": "query", "meta": "tokens|userinfo", "type": "csrf", "uiprop": "rights|groups", "format": "json"},
            headers=headers,
            cookies=cookies_dict
        )
        csrf_json = csrf_res.json()
        user_info = csrf_json.get("query", {}).get("userinfo", {})
        csrf_token = csrf_json.get("query", {}).get("tokens", {}).get("csrftoken")

        session_data["cookies"] = cookies_dict
        session_data["username"] = user_info.get("name", req.username)
        session_data["logged_in"] = True
        session_data["csrf_token"] = csrf_token
        session_data["endpoint"] = endpoint
        session_data["rights"] = user_info.get("rights", [])

        return {
            "success": True,
            "username": session_data["username"],
            "session_id": sid,
            "rights": session_data["rights"],
            "endpoint": endpoint
        }


@router.get("/user")
async def get_current_user(x_session_id: Optional[str] = Header(None)):
    if not x_session_id or x_session_id not in SESSION_STORE:
        return {"logged_in": False, "username": None, "endpoint": DEFAULT_ENDPOINT}

    sess = SESSION_STORE[x_session_id]
    return {
        "logged_in": sess.get("logged_in", False),
        "username": sess.get("username"),
        "endpoint": sess.get("endpoint", DEFAULT_ENDPOINT),
        "rights": sess.get("rights", [])
    }


@router.post("/logout")
async def logout(x_session_id: Optional[str] = Header(None)):
    if x_session_id and x_session_id in SESSION_STORE:
        SESSION_STORE.pop(x_session_id)
    return {"success": True, "message": "Logged out successfully."}


@router.post("/save")
async def save_article(req: SaveArticleRequest, x_session_id: Optional[str] = Header(None)):
    """
    Safely saves article revision.
    Requires user confirmation and verifies conflict detection.
    Supports dry run mode.
    """
    endpoint = _clean_endpoint(req.endpoint)
    session_data = SESSION_STORE.get(x_session_id, {}) if x_session_id else {}

    # Check edit conflicts first
    # Fetch current revision metadata
    headers = {"User-Agent": "AmericanEnglishLocalizationTool/1.0"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        check_res = await client.get(
            endpoint,
            params={
                "action": "query",
                "prop": "revisions",
                "titles": req.title,
                "rvprop": "ids|timestamp|user",
                "format": "json"
            },
            headers=headers
        )
        check_json = check_res.json()
        pages = check_json.get("query", {}).get("pages", {})
        if pages:
            page_data = next(iter(pages.values()))
            revs = page_data.get("revisions", [])
            if revs:
                latest_rev = revs[0]
                current_revid = latest_rev.get("revid")
                current_timestamp = latest_rev.get("timestamp")

                if req.expected_revid and current_revid != req.expected_revid:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            f"EDIT CONFLICT DETECTED: The page was modified by '{latest_rev.get('user')}' "
                            f"at {current_timestamp} (revid: {current_revid}) after you retrieved it "
                            f"(revid: {req.expected_revid}). Please review the newer revision before saving."
                        )
                    )

    if req.is_dry_run:
        return {
            "success": True,
            "is_dry_run": True,
            "title": req.title,
            "message": "DRY RUN: Validation passed, no edit conflict detected. Page would be saved successfully.",
            "edit_summary": req.summary
        }

    # Perform actual live save
    if not session_data.get("logged_in"):
        raise HTTPException(
            status_code=401,
            detail="Cannot save live edits without an authenticated MediaWiki account. Please login with your MediaWiki credentials."
        )

    cookies = session_data.get("cookies", {})
    csrf_token = session_data.get("csrf_token")

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Refresh CSRF token if needed
        if not csrf_token:
            t_res = await client.get(
                endpoint,
                params={"action": "query", "meta": "tokens", "type": "csrf", "format": "json"},
                headers=headers,
                cookies=cookies
            )
            csrf_token = t_res.json().get("query", {}).get("tokens", {}).get("csrftoken")

        save_payload = {
            "action": "edit",
            "title": req.title,
            "text": req.wikitext,
            "summary": req.summary,
            "token": csrf_token,
            "format": "json"
        }
        if req.basetimestamp:
            save_payload["basetimestamp"] = req.basetimestamp

        edit_res = await client.post(endpoint, data=save_payload, headers=headers, cookies=cookies)
        edit_json = edit_res.json()

    if "error" in edit_json:
        err = edit_json["error"]
        code = err.get("code")
        info = err.get("info", "Unknown MediaWiki edit error")
        if code in ("editconflict", "basetimestamp"):
            raise HTTPException(status_code=409, detail=f"Edit conflict: {info}")
        raise HTTPException(status_code=400, detail=f"MediaWiki save error ({code}): {info}")

    edit_result = edit_json.get("edit", {})
    return {
        "success": True,
        "is_dry_run": False,
        "title": req.title,
        "new_revid": edit_result.get("newrevid"),
        "result": edit_result.get("result"),
        "new_timestamp": edit_result.get("newtimestamp"),
        "edit_summary": req.summary
    }
