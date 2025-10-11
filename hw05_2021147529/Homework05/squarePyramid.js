export class SquarePyramid {
    constructor(gl, options = {}) {
        this.gl = gl;
        
        // Creating VAO and buffers
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // Define vertex
        const apex = [0.0, 1.0, 0.0];      // 꼭짓점: 높이 1
        const v0   = [0.5, 0.0, 0.5];      // front-right
        const v1   = [-0.5, 0.0, 0.5];     // front-left
        const v2   = [-0.5, 0.0, -0.5];    // back-left
        const v3   = [0.5, 0.0, -0.5];     // back-right

        const sidePositions = [
            // front  (v0, v1, apex)
            ...v0, ...v1, ...apex,
            // right  (v3, v0, apex)
            ...v3, ...v0, ...apex,
            // back   (v2, v3, apex)
            ...v2, ...v3, ...apex,
            // left   (v1, v2, apex)
            ...v1, ...v2, ...apex,
        ];

        // 밑면(사각형): CCW = v0->v1->v2->v3
        const basePositions = [
            ...v0, ...v3, ...v2, ...v1
        ];


        // Initializing data
        this.vertices = new Float32Array([
            ...sidePositions,
            ...basePositions
        ]);

        this.normals = new Float32Array([
            // front (v0, v1, apex)  → 3 verts
            0.0,  0.4472136,  0.89442719,
            0.0,  0.4472136,  0.89442719,
            0.0,  0.4472136,  0.89442719,

            // right (v3, v0, apex)  → 3 verts
            0.89442719,  0.4472136,  0.0,
            0.89442719,  0.4472136,  0.0,
            0.89442719,  0.4472136,  0.0,

            // back (v2, v3, apex)   → 3 verts
            0.0,  0.4472136, -0.89442719,
            0.0,  0.4472136, -0.89442719,
            0.0,  0.4472136, -0.89442719,

            // left (v1, v2, apex)   → 3 verts
            -0.89442719,  0.4472136,  0.0,
            -0.89442719,  0.4472136,  0.0,
            -0.89442719,  0.4472136,  0.0,

            // base (v0, v1, v2, v3) → 4 verts (y=0에 있는 밑면, 바깥쪽은 -y)
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,
        ]);


        // if color is provided, set all vertices' color to the given color
        if (options.color) {
            for (let i = 0; i < 16 * 4; i += 4) {
                this.colors[i] = options.color[0];
                this.colors[i+1] = options.color[1];
                this.colors[i+2] = options.color[2];
                this.colors[i+3] = options.color[3];
            }
        }
        else {
            this.colors = new Float32Array([
                // front face (v0,v1,v2,v3) - red
                1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1,
                // right face (v0,v3,v4,v5) - yellow
                1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1,
                // left face (v1,v6,v7,v2) - cyan
                0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1,
                // bottom face (v7,v4,v3,v2) - blue
                0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1,
                // back face (v4,v7,v6,v5) - magenta
                0, 1, 0, 1,   0, 1, 0, 1,   0, 1, 0, 1
            ]);
        }

        const triUV = [1,0,  0,0,  0.5,1];
        this.texCoords = new Float32Array([
            ...triUV,      // front (0,1,2)
            ...triUV,      // right (3,4,5)
            ...triUV,      // back  (6,7,8)
            ...triUV,      // left  (9,10,11)
            // base: 정사각형 전체
            1,1,  0,1,  0,0,  1,0   // (12,13,14,15)
        ]);

        this.indices = new Uint16Array([
            // sides (triangles)
            0,1,2,    // front
            3,4,5,    // right
            6,7,8,    // back
            9,10,11,  // left
            // base (two triangles)
            12,13,14,
            12,14,15
        ]);


        this.sameVertices = new Uint16Array([
            // v0 그룹: front(v0=0), right(v0=4), base(v0=12)
            0, 4, 12,
            // v1 그룹: front(v1=1), left(v1=9),  base(v1=13)
            1, 9, 13,
            // v2 그룹: back(v2=6),  left(v2=10), base(v2=14)
            6, 10, 14,
            // v3 그룹: right(v3=3), back(v3=7),  base(v3=15)
            3, 7, 15,
            // apex 그룹(4개 정점을 두 triplet으로 분할해 모두 반영)
            // apex indices: front=2, right=5, back=8, left=11
            2, 5, 8,
            2, 11, 8
        ]);

        this.vertexNormals = new Float32Array(48);
        this.faceNormals = new Float32Array(48);
        this.faceNormals.set(this.normals);

        // compute vertex normals (by averaging face normals)

        for (let i = 0; i < 18; i += 3) {   // <-- 24 -> 18 로 수정

            let vn_x = (this.normals[this.sameVertices[i]*3] + 
                        this.normals[this.sameVertices[i+1]*3] + 
                        this.normals[this.sameVertices[i+2]*3]) / 3; 
            let vn_y = (this.normals[this.sameVertices[i]*3 + 1] + 
                        this.normals[this.sameVertices[i+1]*3 + 1] + 
                        this.normals[this.sameVertices[i+2]*3 + 1]) / 3; 
            let vn_z = (this.normals[this.sameVertices[i]*3 + 2] + 
                        this.normals[this.sameVertices[i+1]*3 + 2] + 
                        this.normals[this.sameVertices[i+2]*3 + 2]) / 3; 

            this.vertexNormals[this.sameVertices[i]*3]       = vn_x;
            this.vertexNormals[this.sameVertices[i+1]*3]     = vn_x;
            this.vertexNormals[this.sameVertices[i+2]*3]     = vn_x;
            this.vertexNormals[this.sameVertices[i]*3 + 1]   = vn_y;
            this.vertexNormals[this.sameVertices[i+1]*3 + 1] = vn_y;
            this.vertexNormals[this.sameVertices[i+2]*3 + 1] = vn_y;
            this.vertexNormals[this.sameVertices[i]*3 + 2]   = vn_z;
            this.vertexNormals[this.sameVertices[i+1]*3 + 2] = vn_z;
            this.vertexNormals[this.sameVertices[i+2]*3 + 2] = vn_z;
        }

        this.initBuffers();
    }

    copyVertexNormalsToNormals() {
        this.normals.set(this.vertexNormals);
    }

    copyFaceNormalsToNormals() {
        this.normals.set(this.faceNormals);
    }

    initBuffers() {
        const gl = this.gl;

        // 버퍼 크기 계산
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);

        // VBO에 데이터 복사
        // gl.bufferSubData(target, offset, data): target buffer의 
        //     offset 위치부터 data를 copy (즉, data를 buffer의 일부에만 copy)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        // EBO에 인덱스 데이터 복사
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // vertex attributes 설정
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // position
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);  // normal
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);  // color
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);  // texCoord

        // vertex attributes 활성화
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        // 버퍼 바인딩 해제
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    updateNormals() {
        const gl = this.gl;
        const vSize = this.vertices.byteLength;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        
        // normals 데이터만 업데이트
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {

        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
} 