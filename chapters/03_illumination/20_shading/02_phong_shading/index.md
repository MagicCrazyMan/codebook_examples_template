[Phong Shading](https://en.wikipedia.org/wiki/Shading#Phong_shading) 是一种更平滑的光照，顶点着色器只负责运算计算每个顶点的法线（经过法线矩阵）、世界坐标（经过模型矩阵）等必要的数据，然后将这些数据传递给片元着色器，片元着色器使用这些经过采样的数据计算光照结果并输出。

> 从本例可以看出，Phong Shading 的平滑效果非常好，因为它将光照的运算放在了片元着色器上，采样后的法线、坐标等数据计算出来的光照结果会更加贴近现实，但代价是更大的计算量。根据实际场景选择合适的 Shading 以平衡性能和现实效果。

> 本例使用的是三角格网化的球体