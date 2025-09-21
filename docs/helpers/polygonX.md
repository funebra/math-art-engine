
---

# 3. Example helper file (`docs/helpers/polygonX.md`)

```markdown
# polygonX() Helper

**Signature:**
```js
polygonX(o, sides, radius, centerX, stepsPerEdge)


**Description:**
Returns the x-coordinate of a point along the edges of a regular polygon with sides sides. Step index o advances along edges; each edge is subdivided into stepsPerEdge.

**Formula**

Let

𝑒
=
⌊
𝑜
/
𝑠
⌋
e=⌊o/s⌋

𝑡
=
(
𝑜
 
m
o
d
 
𝑠
)
/
𝑠
t=(omods)/s

𝜃
1
=
2
𝜋
𝑒
/
𝑛
θ
1
	​

=2πe/n

𝜃
2
=
2
𝜋
(
𝑒
+
1
)
/
𝑛
θ
2
	​

=2π(e+1)/n

Then:

𝑥
=
(
1
−
𝑡
)
(
𝑅
cos
⁡
𝜃
1
+
𝐶
𝑥
)
+
𝑡
(
𝑅
cos
⁡
𝜃
2
+
𝐶
𝑥
)
x=(1−t)(Rcosθ
1
	​

+C
x
	​

)+t(Rcosθ
2
	​

+C
x
	​

)


**Usage in funebra:**
Steps: 6*40
X(o): polygonX(o, 6, 140, 360, 40)
Y(o): polygonY(o, 6, 140, 260, 40)
Z(o): 0


