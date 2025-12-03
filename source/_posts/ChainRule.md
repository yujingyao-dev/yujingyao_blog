---
title: 链式法则
date: 2025-11-23T18:31:00
tags:
  - knowledge
categories: Learning Notes
keywords:
description:
cover: /img/covers/chainrule.webp
---
链式法则应用于复合函数求导。如果函数是“一层套着一层”的，就要把函数像剥洋葱一样一层一层的剥开，再分别处理。直觉上，由于**各层函数之间的影响是层层累积**的，因此，所有的变化之间应该用乘法连接，来表示总的变化。这就是链式法则的内容： 

> **Chain Rule**
> If g is differentiable at x and f is differentiable at u, and y=f(u), u=g(x) then
> $$\frac{dy}{dx}=\frac{dy}{du} \frac{du}{dx}$$
> If there is more than two layers of functions, apply the rule repeatedly:
> $$\frac{dy}{dx}= \frac{dy}{du_{1}} \frac{du_{1}}{du_{2}} \dots \frac{du_{n}}{dx}$$
> where $y$ is function of $u_1$, $u_{i}$ is function of $u_{i+1}$, $u_{n}$ is function of $x$. 

最为直观的理解就是将$dy,dx$等看作一个独立的可以运算的字母，就好像很小的$\Delta y,\Delta x$一样。我只不过是乘上了若干个1， 然后略微排序，就创造出了**层层求导，然后相乘**的局面。

严谨来讲，这实际上是**以直代曲**的误差可以忽略而导致的必然结果。求某点的导数，本质上就是*在用一条直线去逼近那一点附近的函数*，链式法则很好的体现了这一点。

比如，对于一个可导函数$y=f(u)$ , 在$u=a$处，我要使用这*点的斜率（导数），拟合出一条切线*，使用这条切线去估计函数值。对于最终的结果，显然： $$\Delta y=f^{\prime}(a)\Delta u+\epsilon_{1} \Delta u $$ 这里的$\epsilon_{1}$表示该点导数与真实斜率的误差。步长大，离得远，切线的预测就误差大；反之，步长小，离得近，切线就能很好的逼近函数值，因此步长越小，修正斜率的误差项也应当越小。事实的确如此： $$\epsilon_{1}=\lim_{ \Delta u \to 0 } \frac{\Delta y}{\Delta u}-f^{\prime}(a)=\lim_{ \Delta u \to 0 }\frac{f(a+\Delta u)-f(a)}{\Delta u}-f^{\prime}(a)=0$$ 同样的，如果对于另一个可导函数$u=g(x)$ , 在$x=b,g(b)=a$处，也有： $$\Delta u=g^{\prime}(b)\Delta x+\epsilon_{2} \Delta x $$ 这里的$\epsilon_{2}$也表示误差，同样，这个误差：$$\epsilon_{2}=\lim_{ \Delta x \to 0 } \frac{\Delta u}{\Delta x}-g^{\prime}(b)=\lim_{ \Delta x \to 0 }\frac{g(b+\Delta x)-g(b)}{\Delta x}-g^{\prime}(b)=0$$ 因此，在最终的演算中： $$\frac{dy}{dx}=\lim_{ \Delta x \to 0 } \frac{\Delta y}{\Delta x}=\lim_{ \Delta x \to 0 }\frac{(f^{\prime}(a)+\epsilon_{1})\Delta u}{\Delta x}=\lim_{ \Delta x \to 0 }\frac{(f^{\prime}(a)+\epsilon_{1})(g^{\prime}(b)+\epsilon_{2})\Delta x}{\Delta x}=f^{\prime}(g(b))\cdot g^{\prime}(b)$$ 
很明显可以看出，正是由于**误差在步长小的情况下消失了**，因此才给人直观上直接将导数相乘的感觉。微分就是这么来的，我们真的可以把*形如$dy,du,dx$等一系列字符看作一个变量*——描述微小变化量的变量——然后，链式法则就变成了好像“乘以1”的奇妙操作了。追到最本质，就是导数**以直代曲**的思想

对于多元函数的情形，也是类似的。不过我们需要厘清各个变量之间的关系，以及变化是如何累积的。例如，$z=f(x,y),x=g(s,t),y=h(s,t)$ 假定它们均可导，那么各个变量之间的关系是： 

{% mermaid %}
flowchart LR

    A[z] -->|∂z/∂x| B[x]

    A -->|∂z/∂y| C[y]

    B -->|∂x/∂s| D[s]

    B -->|∂x/∂t| E[t]

    C -->|∂y/∂s| D

    C -->|∂y/∂t| E
{% endmermaid %}

因此，根据**变化累积，共同作用于结果**的直觉，我们可以直接写出： $$\frac{ \partial z }{ \partial t }=\frac{ \partial z }{ \partial x }\frac{ \partial x }{ \partial t }+\frac{ \partial z }{ \partial y }\frac{ \partial y }{ \partial t }$$ 对于s也是同理

因此我们可以总结，*对于任意函数的求导，只需顺着所有的路径依次累乘变化量，然后相加，即有整体的变化量*