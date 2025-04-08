//
//  LoadImage.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 5..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#ifndef LoadImage_h
#define LoadImage_h

#include <stdio.h>
#include <OpenGL/gl3.h>
#ifdef __cplusplus
extern "C"{
#endif
GLuint LoadImage(const char* fileName);
GLuint LoadCubeImage(const char* fileName);
#ifdef __cplusplus
}
#endif
#endif /* LoadImage_h */
