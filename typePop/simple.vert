#version 410 core
layout(location=0) in vec3 pos;
layout(location=1) in vec2 vuv;
uniform vec3 colPos;
out vec2 uv;
void main(){
    gl_Position=vec4(pos+colPos, 1);
    uv=vuv;
}