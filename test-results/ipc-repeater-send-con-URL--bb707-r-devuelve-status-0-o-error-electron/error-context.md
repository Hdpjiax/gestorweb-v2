# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ipc.spec.js >> repeater:send con URL bloqueada (tracker) devuelve status 0 o error
- Location: tests\ipc\ipc.spec.js:176:1

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not 200
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e10]:
    - group "DevTools is now available in Spanish!" [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - alert [ref=e18]: DevTools is now available in Spanish!
          - generic [ref=e19]:
            - button "Always match Chrome's language" [ref=e20]:
              - generic: Always match Chrome's language
            - button "Switch DevTools to Spanish" [ref=e21]:
              - generic: Switch DevTools to Spanish
            - button "Don't show again" [ref=e22]:
              - generic: Don't show again
        - button "Close" [ref=e25]
    - generic [ref=e31]:
      - navigation "Main toolbar" [ref=e32]:
        - generic [ref=e34]:
          - button "Select an element in the page to inspect it" [ref=e35]
          - button "Toggle device toolbar" [ref=e37]
        - generic:
          - tablist "Panels":
            - tab "Elements" [selected] [ref=e40]:
              - generic [ref=e41]: Elements
            - tab "Console" [ref=e42]:
              - generic [ref=e43]: Console
            - tab "Sources" [ref=e44]:
              - generic [ref=e45]: Sources
            - tab "Network" [ref=e46]:
              - generic [ref=e47]: Network
          - button "More tabs" [ref=e48]
        - generic [ref=e52]:
          - generic "Open Console to view 1 warning" [ref=e54]:
            - button "Open Console to view 1 warning" [ref=e55]:
              - generic [ref=e57]: "1"
          - button "Settings" [ref=e59]
          - button "Customize and control DevTools" [ref=e61]
          - button "Close" [ref=e63]
      - tabpanel "Elements panel" [ref=e66]:
        - generic "elements" [ref=e67]:
          - generic [ref=e69]:
            - generic [ref=e72]:
              - generic:
                - main "DOM tree explorer" [ref=e74]:
                  - tree "Page DOM" [ref=e77]:
                    - treeitem "<!DOCTYPE html>" [ref=e78]:
                      - generic [ref=e82]: <!DOCTYPE html>
                    - treeitem "<html lang=\"es\">" [expanded] [ref=e83]:
                      - generic "<html lang=\"es\">" [ref=e87]:
                        - text: <html
                        - generic [ref=e88]: lang="es"
                        - text: ">"
                    - group [ref=e89]:
                      - treeitem "<head> Expand …</head>" [ref=e90]:
                        - generic [ref=e93]:
                          - generic "<head>" [ref=e94]
                          - button "Expand" [ref=e96]
                          - text: …
                          - generic "</head>" [ref=e100]
                      - treeitem "<body>" [expanded] [selected] [ref=e101]:
                        - generic [ref=e102]:
                          - generic "<body>" [ref=e107]
                          - generic [ref=e108]: == $0
                      - group [ref=e109]:
                        - treeitem "<div id=\"app\"> Expand …</div>" [ref=e110]:
                          - generic [ref=e113]:
                            - generic "<div id=\"app\">" [ref=e114]:
                              - text: <div
                              - generic [ref=e115]: id="app"
                              - text: ">"
                            - button "Expand" [ref=e117]
                            - text: …
                            - generic "</div>" [ref=e121]
                        - treeitem "<script type=\"module\" src=\"src/renderer/app.js\"></script>" [ref=e122]:
                          - generic [ref=e125]:
                            - generic "<script type=\"module\" src=\"src/renderer/app.js\">" [ref=e126]:
                              - text: <script
                              - generic [ref=e127]: type="module"
                              - generic [ref=e128]:
                                - text: src="
                                - link "src/renderer/app.js" [ref=e130]
                                - text: "\""
                              - text: ">"
                            - generic "</script>" [ref=e131]
                        - treeitem "<script type=\"module\" src=\"src/renderer/browser-redesign-start.js\"></script>" [ref=e132]:
                          - generic [ref=e135]:
                            - generic "<script type=\"module\" src=\"src/renderer/browser-redesign-start.js\">" [ref=e136]:
                              - text: <script
                              - generic [ref=e137]: type="module"
                              - generic [ref=e138]:
                                - text: src="
                                - link "src/renderer/browser-redesign-start.js" [ref=e140]
                                - text: "\""
                              - text: ">"
                            - generic "</script>" [ref=e141]
                        - treeitem "</body>" [ref=e142]:
                          - generic "</body>" [ref=e146]
                      - treeitem "</html>" [ref=e147]:
                        - generic "</html>" [ref=e151]
                - navigation "DOM tree breadcrumbs" [ref=e154]:
                  - list [ref=e156]:
                    - listitem [ref=e157]:
                      - link "html" [ref=e158] [cursor=pointer]:
                        - /url: "#"
                        - generic [ref=e160]: html
                    - listitem [ref=e161]:
                      - link "body" [ref=e162] [cursor=pointer]:
                        - /url: "#"
                        - generic [ref=e164]: body
            - generic [ref=e167]:
              - navigation "Side panel toolbar" [ref=e168]:
                - generic:
                  - tablist:
                    - tab "Styles" [selected] [ref=e169]:
                      - generic [ref=e170]: Styles
                    - tab "Computed" [ref=e171]:
                      - generic [ref=e172]: Computed
                    - tab "Layout" [ref=e173]:
                      - generic [ref=e174]: Layout
                    - tab "Event Listeners" [ref=e175]:
                      - generic [ref=e176]: Event Listeners
                    - tab "DOM Breakpoints" [ref=e177]:
                      - generic [ref=e178]: DOM Breakpoints
                    - tab "Properties" [ref=e179]:
                      - generic [ref=e180]: Properties
                    - tab "Accessibility" [ref=e181]:
                      - generic [ref=e182]: Accessibility
              - complementary "Side panel content" [ref=e184]:
                - tabpanel "Styles panel" [ref=e185]:
                  - generic [ref=e190]:
                    - generic [ref=e192]:
                      - generic [ref=e196]:
                        - textbox "Filter" [ref=e201]
                        - button "Toggle Element State" [ref=e202]:
                          - generic [ref=e203]: :hov
                        - button "Element Classes" [ref=e204]:
                          - generic [ref=e205]: .cls
                        - button "New Style Rule" [ref=e206]
                        - button "Toggle common rendering emulations" [ref=e209]
                        - button "Show Computed Styles sidebar" [ref=e211]
                      - list [ref=e213]:
                        - listitem "element.style, css selector" [ref=e214]:
                          - generic [ref=e216]:
                            - generic [ref=e218]: "element.style {"
                            - generic [ref=e219]:
                              - generic:
                                - tree
                            - generic [ref=e220]: "}"
                        - listitem "body, css selector" [ref=e221]:
                          - link "styles.css:1192" [ref=e223] [cursor=pointer]
                          - generic [ref=e226]:
                            - generic [ref=e227]: "@media"
                            - generic [ref=e228]: "(max-width: 1100px)"
                            - text: "{"
                          - generic [ref=e229]:
                            - generic [ref=e231]:
                              - generic "CSS selector" [ref=e232]: body
                              - text: "{"
                            - tree [ref=e235]:
                              - 'treeitem "CSS property name: overflow : CSS property value: auto;" [ref=e236]':
                                - text: overflow
                                - generic [ref=e237]: ":"
                                - text: auto;
                            - generic [ref=e239]: "}"
                          - generic [ref=e241]: "}"
                        - listitem "body, css selector" [ref=e242]:
                          - link "styles.css:31" [ref=e244] [cursor=pointer]
                          - generic [ref=e245]:
                            - generic [ref=e247]:
                              - generic "CSS selector" [ref=e248]: body
                              - text: "{"
                            - tree [ref=e251]:
                              - 'treeitem "CSS property name: margin : CSS property value: 0;" [ref=e252]':
                                - text: margin
                                - generic [ref=e253]: ":"
                                - text: 0;
                              - 'treeitem "CSS property name: background : CSS property value: var(--bg-base);" [ref=e255]':
                                - text: background
                                - generic [ref=e256]: ":"
                                - 'generic "CSS property value: var(--bg-base)" [ref=e258]':
                                  - generic [ref=e259]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e260]
                                    - generic:
                                      - text: var(--bg-base)
                                      - generic [ref=e262]:
                                        - text: var(
                                        - link "--bg-base" [ref=e264] [cursor=pointer]
                                        - text: )
                                - text: ;
                              - 'treeitem "CSS property name: color : CSS property value: var(--text);" [ref=e265]':
                                - text: color
                                - generic [ref=e266]: ":"
                                - 'generic "CSS property value: var(--text)" [ref=e267]':
                                  - generic [ref=e268]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e269]
                                    - generic:
                                      - text: var(--text)
                                      - generic [ref=e271]:
                                        - text: var(
                                        - link "--text" [ref=e273] [cursor=pointer]
                                        - text: )
                                - text: ;
                              - 'treeitem "CSS property name: font-family : CSS property value: Inter, system-ui, sans-serif;" [ref=e274]':
                                - text: font-family
                                - generic [ref=e275]: ":"
                                - text: Inter, system-ui, sans-serif;
                              - 'treeitem "CSS property name: overflow : CSS property value: hidden;" [ref=e276]':
                                - text: overflow
                                - generic [ref=e277]: ":"
                                - text: hidden;
                            - generic [ref=e279]: "}"
                        - 'listitem "html, body, #app, css selector" [ref=e280]':
                          - link "styles.css:27" [ref=e282] [cursor=pointer]
                          - generic [ref=e283]:
                            - generic [ref=e285]:
                              - generic "CSS selector" [ref=e286]: "html, body, #app"
                              - text: "{"
                            - tree [ref=e289]:
                              - 'treeitem "CSS property name: height : CSS property value: 100%;" [ref=e290]':
                                - text: height
                                - generic [ref=e291]: ":"
                                - text: 100%;
                            - generic [ref=e292]: "}"
                        - listitem "*, css selector" [ref=e293]:
                          - link "styles.css:21" [ref=e295] [cursor=pointer]
                          - generic [ref=e296]:
                            - generic [ref=e298]:
                              - generic "CSS selector" [ref=e299]: "*"
                              - text: "{"
                            - tree [ref=e302]:
                              - 'treeitem "CSS property name: box-sizing : CSS property value: border-box;" [ref=e303]':
                                - text: box-sizing
                                - generic [ref=e304]: ":"
                                - text: border-box;
                            - generic [ref=e305]: "}"
                        - listitem "body, css selector" [ref=e306]:
                          - generic [ref=e307]: user agent stylesheet
                          - generic [ref=e308]:
                            - generic [ref=e310]:
                              - generic "CSS selector" [ref=e311]: body
                              - text: "{"
                            - tree [ref=e314]:
                              - 'treeitem "CSS property name: display : CSS property value: block;" [ref=e315]':
                                - text: display
                                - generic [ref=e316]: ":"
                                - text: block;
                              - 'treeitem "CSS property name: margin : CSS property value: 8px;" [ref=e317]':
                                - text: margin
                                - generic [ref=e318]: ":"
                                - text: 8px;
                            - generic [ref=e320]: "}"
                        - generic [ref=e321]:
                          - text: Inherited from
                          - button "html" [ref=e323] [cursor=pointer]
                        - listitem ":root, css selector" [ref=e324]:
                          - button "<style>" [ref=e326] [cursor=pointer]:
                            - generic: <style>
                          - generic [ref=e327]:
                            - generic [ref=e329]:
                              - generic "CSS selector" [ref=e330]: :root
                              - text: "{"
                            - tree [ref=e333]:
                              - 'treeitem "CSS property name: --radius-sm : CSS property value: 8px;" [ref=e334]':
                                - text: "--radius-sm"
                                - generic [ref=e335]: ":"
                                - text: 8px;
                              - 'treeitem "CSS property name: --radius-md : CSS property value: 12px;" [ref=e336]':
                                - text: "--radius-md"
                                - generic [ref=e337]: ":"
                                - text: 12px;
                              - 'treeitem "CSS property name: --radius-lg : CSS property value: 18px;" [ref=e338]':
                                - text: "--radius-lg"
                                - generic [ref=e339]: ":"
                                - text: 18px;
                              - 'treeitem "CSS property name: --ring : CSS property value: 0 0 0 3px rgb(124 92 255 / 0.28);" [ref=e340]':
                                - text: "--ring"
                                - generic [ref=e341]: ":"
                                - 'generic "CSS property value: 0 0 0 3px rgb(124 92 255 / 0.28)" [ref=e342]':
                                  - text: 0 0 0 3px
                                  - generic [ref=e343]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e344]
                                    - generic: rgb(124 92 255 / 0.28)
                                - text: ;
                            - generic [ref=e346]: "}"
                        - listitem ":root, css selector" [ref=e347]:
                          - link "styles.css:3" [ref=e349] [cursor=pointer]
                          - generic [ref=e350]:
                            - generic [ref=e352]:
                              - generic "CSS selector" [ref=e353]: :root
                              - text: "{"
                            - tree [ref=e356]:
                              - 'treeitem "CSS property name: color-scheme : CSS property value: dark;" [ref=e357]':
                                - text: color-scheme
                                - generic [ref=e358]: ":"
                                - text: dark;
                              - 'treeitem "CSS property name: --bg-base : CSS property value: #0a0e14;" [ref=e359]':
                                - text: "--bg-base"
                                - generic [ref=e360]: ":"
                                - 'generic "CSS property value: #0a0e14" [ref=e361]':
                                  - generic [ref=e362]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e363]
                                    - generic: "#0a0e14"
                                - text: ;
                              - 'treeitem "CSS property name: --bg-panel : CSS property value: #10151d;" [ref=e365]':
                                - text: "--bg-panel"
                                - generic [ref=e366]: ":"
                                - 'generic "CSS property value: #10151d" [ref=e367]':
                                  - generic [ref=e368]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e369]
                                    - generic: "#10151d"
                                - text: ;
                              - 'treeitem "CSS property name: --bg-row : CSS property value: #141a23;" [ref=e371]':
                                - text: "--bg-row"
                                - generic [ref=e372]: ":"
                                - 'generic "CSS property value: #141a23" [ref=e373]':
                                  - generic [ref=e374]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e375]
                                    - generic: "#141a23"
                                - text: ;
                              - 'treeitem "CSS property name: --bg-hover : CSS property value: #1a2230;" [ref=e377]':
                                - text: "--bg-hover"
                                - generic [ref=e378]: ":"
                                - 'generic "CSS property value: #1a2230" [ref=e379]':
                                  - generic [ref=e380]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e381]
                                    - generic: "#1a2230"
                                - text: ;
                              - 'treeitem "CSS property name: --bg-border : CSS property value: #1f2733;" [ref=e383]':
                                - text: "--bg-border"
                                - generic [ref=e384]: ":"
                                - 'generic "CSS property value: #1f2733" [ref=e385]':
                                  - generic [ref=e386]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e387]
                                    - generic: "#1f2733"
                                - text: ;
                              - 'treeitem "CSS property name: --accent : CSS property value: #7c5cff;" [ref=e389]':
                                - text: "--accent"
                                - generic [ref=e390]: ":"
                                - 'generic "CSS property value: #7c5cff" [ref=e391]':
                                  - generic [ref=e392]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e393]
                                    - generic: "#7c5cff"
                                - text: ;
                              - 'treeitem "CSS property name: --accent-soft : CSS property value: #5b3fd9;" [ref=e395]':
                                - text: "--accent-soft"
                                - generic [ref=e396]: ":"
                                - 'generic "CSS property value: #5b3fd9" [ref=e397]':
                                  - generic [ref=e398]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e399]
                                    - generic: "#5b3fd9"
                                - text: ;
                              - 'treeitem "CSS property name: --live : CSS property value: #22c55e;" [ref=e401]':
                                - text: "--live"
                                - generic [ref=e402]: ":"
                                - 'generic "CSS property value: #22c55e" [ref=e403]':
                                  - generic [ref=e404]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e405]
                                    - generic: "#22c55e"
                                - text: ;
                              - 'treeitem "CSS property name: --warn : CSS property value: #f59e0b;" [ref=e407]':
                                - text: "--warn"
                                - generic [ref=e408]: ":"
                                - 'generic "CSS property value: #f59e0b" [ref=e409]':
                                  - generic [ref=e410]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e411]
                                    - generic: "#f59e0b"
                                - text: ;
                              - 'treeitem "CSS property name: --danger : CSS property value: #f87171;" [ref=e413]':
                                - text: "--danger"
                                - generic [ref=e414]: ":"
                                - 'generic "CSS property value: #f87171" [ref=e415]':
                                  - generic [ref=e416]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e417]
                                    - generic: "#f87171"
                                - text: ;
                              - 'treeitem "CSS property name: --text : CSS property value: #e5e7eb;" [ref=e419]':
                                - text: "--text"
                                - generic [ref=e420]: ":"
                                - 'generic "CSS property value: #e5e7eb" [ref=e421]':
                                  - generic [ref=e422]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e423]
                                    - generic: "#e5e7eb"
                                - text: ;
                              - 'treeitem "CSS property name: --muted : CSS property value: #9ca3af;" [ref=e425]':
                                - text: "--muted"
                                - generic [ref=e426]: ":"
                                - 'generic "CSS property value: #9ca3af" [ref=e427]':
                                  - generic [ref=e428]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e429]
                                    - generic: "#9ca3af"
                                - text: ;
                              - 'treeitem "CSS property name: --dim : CSS property value: #6b7280;" [ref=e431]':
                                - text: "--dim"
                                - generic [ref=e432]: ":"
                                - 'generic "CSS property value: #6b7280" [ref=e433]':
                                  - generic [ref=e434]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e435]
                                    - generic: "#6b7280"
                                - text: ;
                              - 'treeitem "CSS property name: --shadow : CSS property value: 0 24px 80px rgb(0 0 0 / 0.45);" [ref=e437]':
                                - text: "--shadow"
                                - generic [ref=e438]: ":"
                                - 'generic "CSS property value: 0 24px 80px rgb(0 0 0 / 0.45)" [ref=e439]':
                                  - text: 0 24px 80px
                                  - generic [ref=e440]:
                                    - generic "Open color picker. Shift + Click to change color format." [ref=e441]
                                    - generic: rgb(0 0 0 / 0.45)
                                - text: ;
                            - generic [ref=e443]: "}"
                    - generic [ref=e447]:
                      - generic [ref=e448]: margin
                      - generic [ref=e449]: ‒
                      - generic [ref=e450]: ‒
                      - generic [ref=e451]:
                        - generic [ref=e452]: border
                        - generic [ref=e453]: ‒
                        - generic [ref=e454]: ‒
                        - generic [ref=e455]:
                          - generic [ref=e456]: padding
                          - generic [ref=e457]: ‒
                          - generic [ref=e458]: ‒
                          - generic [ref=e459]:
                            - generic [ref=e460]: "852"
                            - generic [ref=e461]: ×
                            - generic [ref=e462]: "818"
                          - generic [ref=e463]: ‒
                          - generic [ref=e464]: ‒
                        - generic [ref=e465]: ‒
                        - generic [ref=e466]: ‒
                      - generic [ref=e467]: ‒
                      - generic [ref=e468]: ‒
  - alert [ref=e471]: DevTools is docked to right
  - alert
```

# Test source

```ts
  78  |   const saveResult = await ipc('state:save', modified);
  79  |   expect(saveResult.ok).toBe(true);
  80  |   const after = await ipc('state:load');
  81  |   expect(after._ipc_test_marker).toBe('gw-test-42');
  82  | });
  83  | 
  84  | test('state:save rechaza payload mayor a MAX_STATE_BYTES', async () => {
  85  |   const huge = { _junk: 'x'.repeat(6 * 1024 * 1024) };
  86  |   await expect(ipc('state:save', huge)).rejects.toThrow();
  87  | });
  88  | 
  89  | // ── Seguridad ─────────────────────────────────────────────────────────────────
  90  | test('security:status reporta contextIsolation:true y nodeIntegration:false', async () => {
  91  |   const s = await ipc('security:status');
  92  |   expect(s.contextIsolation).toBe(true);
  93  |   expect(s.nodeIntegration).toBe(false);
  94  |   expect(s.mainSandboxed).toBe(true);
  95  | });
  96  | 
  97  | // ── Licencia ─────────────────────────────────────────────────────────────────
  98  | test('license:hwid devuelve string con formato GW-XXXX-XXXX-XXXX', async () => {
  99  |   const hwid = await ipc('license:hwid');
  100 |   expect(typeof hwid).toBe('string');
  101 |   expect(hwid).toMatch(/^GW-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  102 | });
  103 | 
  104 | test('license:status devuelve hwid y active:false en vault limpio', async () => {
  105 |   const status = await ipc('license:status');
  106 |   expect(status.hwid).toMatch(/^GW-/);
  107 |   expect(status.active).toBe(false);
  108 | });
  109 | 
  110 | test('license:claimByKey rechaza clave con formato incorrecto', async () => {
  111 |   const result = await ipc('license:claimByKey', 'CLAVE-INVALIDA-123');
  112 |   expect(result.active).toBe(false);
  113 |   expect(typeof result.reason).toBe('string');
  114 | });
  115 | 
  116 | test('license:claimByKey rechaza clave GW-LIC-V1 sin GW_LICENSE_SECRET configurado', async () => {
  117 |   const fakeKey = 'GW-LIC-V1:' + Buffer.from('{"tier":"pro"}').toString('base64') + '.aabbccdd';
  118 |   const result = await ipc('license:claimByKey', fakeKey);
  119 |   expect(result.active).toBe(false);
  120 |   expect(result.reason).toMatch(/GW_LICENSE_SECRET/i);
  121 | });
  122 | 
  123 | test('license:install con clave válida GW-XXXX activa la licencia en el vault', async () => {
  124 |   const hwid = await ipc('license:hwid');
  125 |   const tail = hwid.replace(/-/g, '').toUpperCase().slice(-12);
  126 |   const validKey = `GW-${tail.slice(0,4)}-${tail.slice(4,8)}-${tail.slice(8,12)}`;
  127 | 
  128 |   const result = await ipc('license:install', validKey);
  129 |   expect(result.active).toBe(true);
  130 |   expect(result.tier).toBe('standard');
  131 | 
  132 |   const status = await ipc('license:status');
  133 |   expect(status.active).toBe(true);
  134 | });
  135 | 
  136 | // ── TOTP ──────────────────────────────────────────────────────────────────────
  137 | test('totp:code devuelve código de 6 dígitos y secondsLeft válido', async () => {
  138 |   const secret = 'JBSWY3DPEHPK3PXP';
  139 |   const result = await ipc('totp:code', secret);
  140 |   expect(result.code).toMatch(/^\d{6}$/);
  141 |   expect(result.secondsLeft).toBeGreaterThan(0);
  142 |   expect(result.secondsLeft).toBeLessThanOrEqual(30);
  143 | });
  144 | 
  145 | test('totp:code rechaza secreto base32 inválido', async () => {
  146 |   await expect(ipc('totp:code', '!!!INVALIDO!!!')).rejects.toThrow();
  147 | });
  148 | 
  149 | // ── Proxies ───────────────────────────────────────────────────────────────────
  150 | test('proxies:check con proxy localhost inalcanzable devuelve ok:false', async () => {
  151 |   const result = await ipc('proxies:check', { host: '127.0.0.1', port: 19999, scheme: 'http' });
  152 |   expect(result.ok).toBe(false);
  153 |   expect(typeof result.ms).toBe('number');
  154 | });
  155 | 
  156 | test('proxies:checkAll con array vacío devuelve array vacío', async () => {
  157 |   const result = await ipc('proxies:checkAll', []);
  158 |   expect(Array.isArray(result)).toBe(true);
  159 |   expect(result.length).toBe(0);
  160 | });
  161 | 
  162 | test('proxies:checkAll trunca a 500 proxies máximo', async () => {
  163 |   const many = Array.from({ length: 600 }, (_, i) => ({ host: '127.0.0.1', port: 20000 + i, scheme: 'http' }));
  164 |   const result = await ipc('proxies:checkAll', many);
  165 |   expect(result.length).toBeLessThanOrEqual(500);
  166 | });
  167 | 
  168 | // ── Repeater ──────────────────────────────────────────────────────────────────
  169 | test('repeater:send a URL real devuelve status HTTP y ms', async () => {
  170 |   const result = await ipc('repeater:send', { method: 'GET', url: 'https://httpbin.org/status/200' });
  171 |   expect(result.status).toBe(200);
  172 |   expect(typeof result.ms).toBe('number');
  173 |   expect(result.ms).toBeGreaterThan(0);
  174 | }, { timeout: 15_000 });
  175 | 
  176 | test('repeater:send con URL bloqueada (tracker) devuelve status 0 o error', async () => {
  177 |   const result = await ipc('repeater:send', { method: 'GET', url: 'https://www.google-analytics.com/' });
> 178 |   expect(result.status).not.toBe(200);
      |                             ^ Error: expect(received).not.toBe(expected) // Object.is equality
  179 | });
  180 | 
  181 | test('repeater:send con URL inválida devuelve status 0 sin lanzar excepción', async () => {
  182 |   const result = await ipc('repeater:send', { method: 'GET', url: 'no-es-una-url' });
  183 |   expect(result.status).toBe(0);
  184 |   expect(typeof result.body).toBe('string');
  185 | });
  186 | 
  187 | // ── Cookies ───────────────────────────────────────────────────────────────────
  188 | test('cookies:get en perfil nuevo devuelve array vacío', async () => {
  189 |   const cookies = await ipc('cookies:get', 9999);
  190 |   expect(Array.isArray(cookies)).toBe(true);
  191 | });
  192 | 
  193 | test('cookies:set guarda cookie y cookies:get la recupera', async () => {
  194 |   const pid = 8001;
  195 |   const cookie = {
  196 |     url: 'https://test.gestor.local',
  197 |     domain: 'test.gestor.local',
  198 |     name: 'gw_test_cookie',
  199 |     value: 'hello_ipc',
  200 |     path: '/'
  201 |   };
  202 |   await ipc('cookies:set', pid, [cookie]);
  203 |   const result = await ipc('cookies:get', pid);
  204 |   const found = result.find(c => c.name === 'gw_test_cookie');
  205 |   expect(found).toBeDefined();
  206 |   expect(found.value).toBe('hello_ipc');
  207 | });
  208 | 
  209 | test('cookies:clear vacía las cookies del perfil', async () => {
  210 |   const pid = 8001;
  211 |   const result = await ipc('cookies:clear', pid);
  212 |   expect(Array.isArray(result)).toBe(true);
  213 |   expect(result.length).toBe(0);
  214 | });
  215 | 
  216 | // ── browse:freshenMemory ──────────────────────────────────────────────────────
  217 | test('browse:freshenMemory devuelve ok:true para perfil válido', async () => {
  218 |   const result = await ipc('browse:freshenMemory', 9999);
  219 |   expect(result.ok).toBe(true);
  220 | });
  221 | 
  222 | // ── profiles:isWindowOpen ─────────────────────────────────────────────────────
  223 | test('profiles:isWindowOpen devuelve open:false para perfil sin ventana', async () => {
  224 |   const result = await ipc('profiles:isWindowOpen', 9999);
  225 |   expect(result.open).toBe(false);
  226 | });
  227 | 
  228 | // ── Validación de seguridad ───────────────────────────────────────────────────
  229 | test('app:openExternal rechaza URL con protocolo no permitido', async () => {
  230 |   const result = await ipc('app:openExternal', 'javascript:alert(1)');
  231 |   expect(result.ok).toBe(false);
  232 |   expect(result.error).toBe('invalid_url');
  233 | });
  234 | 
  235 | test('app:openExternal acepta URL https válida', async () => {
  236 |   const result = await ipc('app:openExternal', 'https://example.com');
  237 |   expect(result.ok).toBe(true);
  238 | });
  239 | 
```