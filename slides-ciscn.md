---
# You can also start simply with 'default'
theme: default
# random image from a curated Unsplash collection by Anthony
# like them? see https://unsplash.com/collections/94734566/slidev
background: https://cover.sli.dev
# some information about your slides (markdown enabled)
title: CISCN Historical Challenges
# apply unocss classes to the current slide
class: text-center
# https://sli.dev/features/drawing
drawings:
  persist: false
# slide transition: https://sli.dev/guide/animations.html#slide-transitions
transition: slide-left
# enable MDC Syntax: https://sli.dev/features/mdc
mdc: true
---

<!-- markdownlint-disable single-title no-inline-html heading-style blanks-around-headings -->

# CISCN 往年 Web 题目复现

Mix @ {{ new Date().toLocaleDateString() }}

<PoweredBySlidev mt-10 />

<div class="abs-br m-6 text-xl">
  <a href="https://github.com/mnixry" target="_blank" class="slidev-icon-btn">
    <carbon:logo-github />
  </a>
</div>

<!--
The last comment block of each slide will be treated as slide notes. It will be visible and editable in Presenter Mode along with the slide. [Read more in the docs](https://sli.dev/guide/syntax.html#notes)
-->

---
src: ./pages/ciscn-historical-challenges.md
---
