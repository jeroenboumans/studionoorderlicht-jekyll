---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: home
---


How to put something here?

<ul>
  {% for post in site.posts %}
    <li>
        <a href="{{ post.url }}"><h2>{{ post.title }}</h2></a>
        <p>{{post.excerpt}}</p>
        
    </li>
  {% endfor %}
</ul>