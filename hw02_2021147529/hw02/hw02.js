import {resizeAspectRatio, setupText} from '../util/util.js'
import {Shader, readShaderFile} from '../util/shader.js'

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;   // shader program
let vao;      // vertex array object
let tx = 0.0, ty = 0.0;       // 현재 이동량
const MOVE = 0.01;   // 1회 이동량
const HALF = 0.1;    // 사각형 반폭/반높이(정점이 ±0.1 기준)
const LIMIT_X = 1.0 - HALF; 
const LIMIT_Y = 1.0 - HALF;
const keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };


function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);

    // Initialize WebGL settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
    
}


function setupBuffers() {
    const vertices = new Float32Array([
        -0.1, -0.1, 0.0,  // Bottom left
         0.1, -0.1, 0.0,  // Bottom right
         0.1,  0.1, 0.0,  // top Right
        -0.1,  0.1, 0.0   // top left
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);
}

function setupKeyboardEvents() {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      
      if (!event.repeat) {
        if (event.key === 'ArrowLeft')  tx = Math.max(-LIMIT_X, Math.min(LIMIT_X, tx - MOVE));
        if (event.key === 'ArrowRight') tx = Math.max(-LIMIT_X, Math.min(LIMIT_X, tx + MOVE));
        if (event.key === 'ArrowUp')    ty = Math.max(-LIMIT_Y, Math.min(LIMIT_Y, ty + MOVE));
        if (event.key === 'ArrowDown')  ty = Math.max(-LIMIT_Y, Math.min(LIMIT_Y, ty - MOVE));      
      }
      else{
            keys[event.key] = true;
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      keys[event.key] = false;
    }
  });
}

function handleKeyInput() {
  const minX = -LIMIT_X, maxX = LIMIT_X;
  const minY = -LIMIT_Y, maxY = LIMIT_Y;

  let nx = tx, ny = ty;
  if (keys.ArrowLeft)  nx -= MOVE;
  if (keys.ArrowRight) nx += MOVE;
  if (keys.ArrowUp)    ny += MOVE;
  if (keys.ArrowDown)  ny -= MOVE;

  if (nx >= minX && nx <= maxX) tx = nx;
  if (ny >= minY && ny <= maxY) ty = ny;
}

function render() {
    handleKeyInput();

    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.use();                        // 프로그램 활성화
    shader.setVec2('uMove', tx, ty); 

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    requestAnimationFrame(() => render());
}

async function main() {
    try {

        // WebGL 초기화
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        // 셰이더 초기화
        await initShader();

        // setup text overlay (see util.js)
        setupText(canvas, "Use arrow keys to move the rectangle", 1);
        
        // 키보드 이벤트 설정
        setupKeyboardEvents();
        
        // 나머지 초기화
        setupBuffers(shader);
        shader.use();
        
        // 렌더링 시작
        render();

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

// call main function
main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});