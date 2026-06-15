import asyncio
import os
import tempfile
from pathlib import Path
from docx import Document
from playwright.async_api import async_playwright, Page, BrowserContext

# Location of the user's primary resume PDF, if it exists
RESUME_PATH = Path("app/api/uploads/resume.pdf")

async def fill_heuristic_fields(page: Page, profile: dict):
    """
    Attempts to map the user's profile data to standard application form fields.
    """
    # Simple dictionary of regex patterns to data values
    
    # Get basic info from profile
    first_name = ""
    last_name = ""
    name_parts = profile.get("name", "").split(" ")
    if len(name_parts) >= 2:
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:])
    else:
        first_name = profile.get("name", "")

    mappings = [
        ({"name": "first", "placeholder": "first"}, first_name),
        ({"name": "last", "placeholder": "last"}, last_name),
        ({"name": "email", "placeholder": "email", "type": "email"}, profile.get("email", "")),
        ({"name": "phone", "placeholder": "phone", "type": "tel"}, profile.get("phone", "")),
        ({"name": "linkedin", "placeholder": "linkedin"}, profile.get("linkedin_url", "")),
        ({"name": "github", "placeholder": "github"}, profile.get("github_url", "")),
        ({"name": "portfolio", "placeholder": "website"}, profile.get("portfolio_url", ""))
    ]

    for mapping, value in mappings:
        if not value:
            continue
        
        # Build a flexible selector string. Playwright allows matching multiple.
        # e.g. input[name*="first" i], input[placeholder*="first" i]
        selectors = []
        if "name" in mapping:
            selectors.append(f'input[name*="{mapping["name"]}" i]')
            selectors.append(f'input[id*="{mapping["name"]}" i]')
        if "placeholder" in mapping:
            selectors.append(f'input[placeholder*="{mapping["placeholder"]}" i]')
        if "type" in mapping:
            selectors.append(f'input[type="{mapping["type"]}"]')

        selector = ", ".join(selectors)
        try:
            # Look for the elements
            elements = await page.locator(selector).all()
            for el in elements:
                is_visible = await el.is_visible()
                is_enabled = await el.is_enabled()
                if is_visible and is_enabled:
                    current_val = await el.input_value()
                    if not current_val:
                        await el.fill(value)
        except Exception:
            pass


async def run_auto_fill(apply_url: str, resume_profile: dict, cover_letter_text: str | None = None):
    """
    Launches a non-headless chromium browser, navigates to apply_url, attempts heuristic 
    filling, and waits for the user to close the browser manually.
    """
    if not apply_url or not apply_url.startswith("http"):
        print(f"Invalid apply_url provided: {apply_url}")
        return

    # Create temporary cover letter file if text is provided
    temp_cover_letter_path = None
    if cover_letter_text:
        doc = Document()
        doc.add_heading(f"Cover Letter", 0)
        doc.add_paragraph(cover_letter_text)
        
        # Save to temp
        fd, temp_cover_letter_path = tempfile.mkstemp(suffix=".docx")
        os.close(fd)
        doc.save(temp_cover_letter_path)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--start-maximized", "--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        try:
            await page.goto(apply_url, wait_until="domcontentloaded", timeout=60000)
            
            # Wait a few seconds for single-page apps / dynamic forms to load
            await page.wait_for_timeout(3000)

            # Heuristic text field filling
            if resume_profile:
                await fill_heuristic_fields(page, resume_profile)

            # Heuristic file uploads
            # Find inputs of type "file"
            file_inputs = await page.locator('input[type="file"]').all()
            for f_input in file_inputs:
                try:
                    # check label or name context
                    id_val = await f_input.get_attribute("id") or ""
                    name_val = await f_input.get_attribute("name") or ""
                    
                    # Heuristically check if it's looking for a resume or cover letter
                    is_resume = "resume" in id_val.lower() or "resume" in name_val.lower() or "cv" in id_val.lower() or "cv" in name_val.lower()
                    is_cover = "cover" in id_val.lower() or "cover" in name_val.lower() or "letter" in id_val.lower()

                    if is_resume and RESUME_PATH.exists():
                        await f_input.set_input_files(str(RESUME_PATH.absolute()))
                    elif is_cover and temp_cover_letter_path:
                        await f_input.set_input_files(temp_cover_letter_path)
                    elif not is_resume and not is_cover:
                        # Fallback: if there's only one file input, usually it's the resume
                        if len(file_inputs) == 1 and RESUME_PATH.exists():
                            await f_input.set_input_files(str(RESUME_PATH.absolute()))
                except Exception:
                    pass

            # Wait indefinitely until the page or browser context is closed by the user
            # We wait for the page "close" event
            await page.wait_for_event("close", timeout=0)
            
        except Exception as e:
            print(f"Playwright automation error: {e}")
        finally:
            # Cleanup temp files
            if temp_cover_letter_path and os.path.exists(temp_cover_letter_path):
                os.remove(temp_cover_letter_path)
            
            await browser.close()
