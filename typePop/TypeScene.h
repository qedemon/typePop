//
//  TypeScene.h
//  typePop
//
//  Created by KimTaeseok on 2015. 11. 29..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//
#import <ft2build.h>
#import FT_FREETYPE_H
#import <OpenGL/gl3.h>
#import <Foundation/Foundation.h>
#import "Scene.h"
#import "Glyph.h"

@interface TypeScene : NSObject<Scene>{
    GLuint colVao;
    GLint colPosLocation;
    GLuint gridVao;
    GLuint bgProgram;
    GLuint program;
    NSMutableDictionary* texDict;
    FT_Face face;
    Glyph* currentGlyph;
    GLint mLocation;
    GLint eyeLocation;
    GLint rLocation;
    GLuint bgTex;
    GLint texLocation;
}
@property double outputTime;
@property NSRect frame;
@end
