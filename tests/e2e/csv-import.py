import asyncio
from playwright.async_api import async_playwright

CSV = """Company;Job title;City;Date;Status;Source;Remote
Spendesk;Frontend Engineer;Paris;12/03/2026;Applied;LinkedIn;Hybride
Doctolib;Développeuse Frontend React;Paris;01/02/2026;Entretien;Indeed;Sur site
;Missing company;Lyon;2026-02-01;Applied;Indeed;Remote
"""

async def main():
    with open("/tmp/browser/csv/sample.csv","w",encoding="utf-8") as f: f.write(CSV)
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()
        errs=[]
        page.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        await page.goto("http://localhost:8080/parametres", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        await page.set_input_files('input[type=file][accept*="csv"]', "/tmp/browser/csv/sample.csv")
        await page.wait_for_timeout(1200)
        await page.screenshot(path="/tmp/browser/csv/dialog.png")
        await page.get_by_role("button", name="Importer", exact=True).click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path="/tmp/browser/csv/report.png")
        txt = await page.locator("[role=dialog]").inner_text()
        print(txt[:600])
        print("ERRORS:", errs[:5])
        await b.close()
asyncio.run(main())
