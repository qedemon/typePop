#version 410 core
out vec4 fcolor;
uniform samplerCube tex;
in vec3 posFromEye;
in vec4 norm;
void main(){
    vec3 point=-reflect(normalize(posFromEye), norm.xyz);
    if(abs(point.y)>abs(point.x)&& abs(point.y)>abs(point.z)){
        point.x=-point.x;
        point.z=-point.z;
    }
    fcolor=texture(tex, point);
}