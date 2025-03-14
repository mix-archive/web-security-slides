---
layout: center
transition: fade-out
---

<!-- markdownlint-disable single-title no-inline-html heading-style blanks-around-headings no-duplicate-heading heading-increment-->

# 常见漏洞：跨站脚本攻击

跨站脚本攻击 (Cross-Site Scripting, XSS) 是一种通过在网页中注入恶意脚本，从而实现攻击目的的漏洞。该漏洞主要发生在对 HTML 不正确拼接的场景中。同时，XSS 也不局限于引用 JavaScript 代码，也可以使用 CSS 等技术来得到窃取用户信息等目的。

```python
# 不安全的拼接
username = "<script>alert('XSS')</script>"
html = "<h1>Hello, " + username + "</h1>"
```

```html
<h1>Hello, <script>alert('XSS')</script></h1>
```

<style>
h1 {
  background-color: #2B90B6;
  background-image: linear-gradient(45deg, #4EC5D4 10%, #146b8c 20%);
  background-size: 100%;
  -webkit-background-clip: text;
  -moz-background-clip: text;
  -webkit-text-fill-color: transparent;
  -moz-text-fill-color: transparent;
}
</style>

---

