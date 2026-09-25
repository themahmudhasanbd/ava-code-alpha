# Browser Automation Subsystem Instructions

## Core Principles: Observe → Reason → Act → Verify
When interacting with websites or web applications:
1. **Observe First**: Always call `browser` with `action="open"` or `action="observe"` before attempting to click or fill elements. The observation assigns unique semantic refs (`e1`, `e2`, `e3`...) to interactive elements.
2. **Use Semantic Refs**: Pass `ref="e1"`, `ref="e2"` directly to `click` or `fill` actions. Do not guess selectors when refs are available.
3. **Verify Outcomes**: After mutating actions (`click`, `fill`, `fill_form`), the tool automatically checks for page navigation, error banners (`[role='alert']`, `.error`), success notices, and validation errors. Inspect these indicators in the output before proceeding.
4. **Stale Ref Handling**: If navigation occurs or if multiple mutations take place, element refs are automatically refreshed. Always use the latest refs from the most recent observation output.
5. **Responsive Audits**: Use `action="responsive_audit"` to verify mobile/tablet/desktop layouts. It tests viewports, checks `scrollWidth` vs `clientWidth`, flags horizontal overflow bugs, and identifies the exact culprit elements causing overflow.
6. **Structured Scraping**: Use `action="scrape_data"` with `container_selector` and `field_selectors` to extract clean tabular JSON datasets, or `action="scrape_content"` to extract clean text.
