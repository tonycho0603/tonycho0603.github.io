import { resizeAspectRatio } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let startTime;

// VAO for each component
let poleVAO;      // 기둥
let largeBladesVAO;  // 큰 날개들
let smallBladesVAO;  // 작은 날개들

// 풍차 크기 설정 (여기서 수정하면 자동으로 반영됨)
const POLE_WIDTH = 0.15;
const POLE_HEIGHT = 0.8;
const POLE_Y_POSITION = -0.3;  // 기둥 중심 y 좌표

const LARGE_BLADE_WIDTH = 0.8;
const LARGE_BLADE_HEIGHT = 0.1;

const SMALL_BLADE_WIDTH = 0.2;
const SMALL_BLADE_HEIGHT = 0.06;

// 미리 계산된 값들 (한 번만 계산)
const WINDMILL_CENTER_Y = POLE_Y_POSITION + POLE_HEIGHT / 2;  // 회전축 y 좌표
const LARGE_BLADE_HALF_WIDTH = LARGE_BLADE_WIDTH / 2;  // 큰 날개 반폭

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0); 

    return true;
}

// 직사각형 버퍼 생성 함수
function createRectangleVAO(width, height, color) {
    const vertices = new Float32Array([
        -width/2,  height/2,  // 좌상단
        -width/2, -height/2,  // 좌하단
         width/2, -height/2,  // 우하단
         width/2,  height/2   // 우상단
    ]);

    const indices = new Uint16Array([
        0, 1, 2,    // 첫 번째 삼각형
        0, 2, 3     // 두 번째 삼각형
    ]);

    const colors = new Float32Array([
        color[0], color[1], color[2], color[3],
        color[0], color[1], color[2], color[3],
        color[0], color[1], color[2], color[3],
        color[0], color[1], color[2], color[3]
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // VBO for position
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    // VBO for color
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);

    // EBO
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    return vao;
}

function setupBuffers() {
    // 풍차 기둥: 갈색
    poleVAO = createRectangleVAO(POLE_WIDTH, POLE_HEIGHT, [0.65, 0.45, 0.25, 1.0]);

    // 큰 날개 (흰색, 가로로 긴 직사각형)
    largeBladesVAO = createRectangleVAO(LARGE_BLADE_WIDTH, LARGE_BLADE_HEIGHT, [1.0, 1.0, 1.0, 1.0]);

    // 작은 날개 (회색)
    smallBladesVAO = createRectangleVAO(SMALL_BLADE_WIDTH, SMALL_BLADE_HEIGHT, [0.65, 0.65, 0.65, 1.0]);
}

function render() {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTime) / 1000.0; // seconds

    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    shader.use();

    // 1. 풍차 기둥 그리기 (고정, 중앙 하단에 위치)
    const poleTransform = mat4.create();
    mat4.translate(poleTransform, poleTransform, [0.0, POLE_Y_POSITION, 0.0]);
    shader.setMat4("u_transform", poleTransform);
    gl.bindVertexArray(poleVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // 2. 큰 흰색 날개 1개 그리기 (가로로 긴 직사각형)
    // rotation angle = sin(elapsedTime) * PI * 2.0
    const largeRotation = Math.sin(elapsedTime) * Math.PI * 2.0;

    const largeBladeTransform = mat4.create();
    // 풍차 중심으로 이동
    mat4.translate(largeBladeTransform, largeBladeTransform, [0.0, WINDMILL_CENTER_Y, 0.0]);
    // 회전 (sin 기반)
    mat4.rotate(largeBladeTransform, largeBladeTransform, largeRotation, [0, 0, 1]);

    shader.setMat4("u_transform", largeBladeTransform);
    gl.bindVertexArray(largeBladesVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // 3. 작은 회색 날개 2개 그리기 (큰 날개 양쪽 끝에 위치)
    // rotation angle = sin(elapsedTime) * PI * -10.0 (큰 날개 기준 추가 회전)
    const smallRotation = Math.sin(elapsedTime) * Math.PI * -10.0;

    for (let i = 0; i < 2; i++) {
        const smallBladeTransform = mat4.create();

        // 풍차 중심으로 이동
        mat4.translate(smallBladeTransform, smallBladeTransform, [0.0, WINDMILL_CENTER_Y, 0.0]);

        // 큰 날개와 같은 회전 적용
        mat4.rotate(smallBladeTransform, smallBladeTransform, largeRotation, [0, 0, 1]);

        // 큰 날개의 양 끝으로 이동 (좌측: -LARGE_BLADE_HALF_WIDTH, 우측: +LARGE_BLADE_HALF_WIDTH)
        const xOffset = (i === 0) ? -LARGE_BLADE_HALF_WIDTH : LARGE_BLADE_HALF_WIDTH;
        mat4.translate(smallBladeTransform, smallBladeTransform, [xOffset, 0.0, 0.0]);

        // 작은 날개의 추가 회전 (큰 날개 기준)
        mat4.rotate(smallBladeTransform, smallBladeTransform, smallRotation, [0, 0, 1]);

        shader.setMat4("u_transform", smallBladeTransform);
        gl.bindVertexArray(smallBladesVAO);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        await initShader();

        setupBuffers();

        // 시작 시간 초기화
        startTime = Date.now();

        requestAnimationFrame(render);

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
