//
//  LoadShader.hpp
//  clParticle
//
//  Created by KimTaeseok on 2015. 11. 15..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#ifndef LoadShader_hpp
#define LoadShader_hpp
#import <OpenGL/gl3.h>
#import <OpenCL/cl.h>

typedef struct ShaderInfo{
    GLenum shaderType;
    const char* fileName;
}ShaderInfo;

GLuint LoadShader(ShaderInfo* info);

cl_program LoadCLProgram(cl_context context , const cl_device_id* devices, cl_int nDevice, const char* fileName);

#endif /* LoadShader_hpp */
