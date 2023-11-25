window.addEventListener('load', () => {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl');

  if(!gl) {
    console.error('webgl is not supported');
  }

  const vertexShaderSource = /* glsl */ `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = /* glsl */ `
    precision mediump float;
    uniform vec2 iResolution;
    uniform float iTime;
    
    //#define TETRASKELION  // if hexagons offend you

    vec3 pal(float a) { 
      return 0.5 + cos(3.0*a + vec3(2,1,0)); }  // Biased rainbow color map. Will be squared later.

      vec2 fold(vec2 p) {  // Shift and fold into a vertex-centered grid.
    
      #ifdef TETRASKELION
      return fract(p) - 0.5;

      #else
      vec4 m = vec4(2,-1, 0,sqrt(3.0));

      p.y += m.w/3.0;      // center at vertex

      vec2 t = mat2(m)*p;  // triangular coordinates (x →, y ↖, x+y ↗)

      return p - 0.5*mat2(m.xzyw) * floor((ceil(t) + ceil(t.x+t.y)) / 3.0);  // fold into hexagonal cells
      #endif
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      float t = iTime / 4.0, t2 = t * 0.618034, t3 = t * 1.4142135;  // dissonant timers

      mat2 M = mat2(cos(t),sin(t), -sin(t),cos(t)) * (1.0 - 0.1*cos(t2));  // rotation and scale: 0.9 [smooth] .. 1.1 [fractal]

      vec2 p = (2.0*fragCoord - iResolution.xy) / iResolution.y;  // y: -1 .. 1

      float d = 0.5*length(p);  // animation phase is based on distance to center

      vec3 sum = vec3(0);

      for (float i = 0.0; i < 24.0; i++) {
        p = fold(M * p); // rotate and scale, fold

        sum += pal(0.01*i - d + t2) / cos(d - t3 + 5.0*length(p));  // interfering concentric circles
        // Use pal(...)/abs(cos(...)) or Use pal(...)/pal(cos(...)) for additive circles.
      }


      fragColor = vec4(0.0002*sum*sum, 1);  // square the sum for better contrast

    }

    void main() {
      vec2 fragCoord = gl_FragCoord.xy;
      vec4 fragColor;
      mainImage(fragColor, fragCoord);
      gl_FragColor = fragColor;
    }
  `;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);

    gl.compileShader(shader);


    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));

      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vertexShader, fragmentShader) {

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);

    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);


    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));

      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = createProgram(gl, vertexShader, fragmentShader);

  gl.useProgram(program);

  const positionAttributeLocation = gl.getAttribLocation(program, 'position');

  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  gl.enableVertexAttribArray(positionAttributeLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  //gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  const resolutionUniformLocation = gl.getUniformLocation(program, 'iResolution');

  const timeUniformLocation = gl.getUniformLocation(program, 'iTime');

  function resize(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  let startTime = performance.now();
  let previousTime = 0;

  function render() {
    resize(canvas);
    let currentTime = performance.now();
    
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const deltaTime = (currentTime - previousTime) / 1000.0;
    previousTime = currentTime;
    const elapsedTime = (currentTime - startTime) / 1000.0;
    
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    gl.uniform1f(timeUniformLocation, elapsedTime);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})