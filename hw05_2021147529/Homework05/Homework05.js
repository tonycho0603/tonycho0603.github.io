
import { resizeAspectRatio, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
import { SquarePyramid } from './squarePyramid.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let startTime;

let isInitialized = false;

let viewMatrix = mat4.create();
let projMatrix = mat4.create();
let modelMatrix = mat4.create(); 
const cameraCircleRadius = 3.0;
const cameraCircleSpeed = 90.0; // deg/sec for x,z movement
const cameraYSpeed = 45.0; // deg/sec for y movement 
const cube = new SquarePyramid(gl);
const axes = new Axes(gl, 1.8);

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('program terminated');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('program terminated with error:', error);
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
    gl.clearColor(0.7, 0.8, 0.9, 1.0);
    
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function render() {

    const currentTime = Date.now();

    // elapsed time from the start time
    const elapsedTime = (currentTime - startTime) / 1000.0; // convert to second

    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Viewing transformation matrix
    let camX = cameraCircleRadius * Math.sin(glMatrix.toRadian(cameraCircleSpeed * elapsedTime));
    let camZ = cameraCircleRadius * Math.cos(glMatrix.toRadian(cameraCircleSpeed * elapsedTime));
    let camY = 5.0 + 5.0 * Math.sin(glMatrix.toRadian(cameraYSpeed * elapsedTime)); // oscillates between 0 and 10
    mat4.lookAt(viewMatrix,
        vec3.fromValues(camX, camY, camZ), // camera position
        vec3.fromValues(0, 0, 0), // look at origin
        vec3.fromValues(0, 1, 0)); // up vector

    
    shader.use();  
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', viewMatrix);
    shader.setMat4('u_projection', projMatrix);
    cube.draw(shader);

    // drawing the axes (using the axes's shader)
    axes.draw(viewMatrix, projMatrix);

    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL initialization failed');
        }
        
        await initShader();

        // Projection transformation matrix
        mat4.perspective(
            projMatrix,
            glMatrix.toRadian(60),  // field of view (fov, degree)
            canvas.width / canvas.height, // aspect ratio
            0.1, // near
            100.0 // far
        );

        // starting time (global variable) for animation
        startTime = Date.now();

        // call the render function the first time for animation
        requestAnimationFrame(render);

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('Failed to initialize program');
        return false;
    }
}
