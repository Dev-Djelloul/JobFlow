import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()
        errs=[]
        page.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        for path,name in [("/data-quality","dq"),("/analytics","analytics"),("/candidatures","cand"),("/parametres","settings")]:
            await page.goto("http://localhost:8080"+path, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)
            await page.screenshot(path=f"/tmp/browser/dq/{name}.png")
        print("ERRORS:", errs[:10])
        await b.close()
asyncio.run(main())
