//
//  TypePopScene.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 9..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <ft2build.h>
#import FT_FREETYPE_H
#import <OpenGL/gl3.h>
#import "Scene.h"

@interface TypePopScene : NSObject<Scene>{
    GLuint simpleProgram;
    GLuint sphereMapProgram;
    GLuint enviromentMap;
    GLuint query;
    FT_Face enFace;
    FT_Face koFace;
    NSMutableDictionary* glyphDict;
    NSMutableDictionary* wingdingDict;
    NSMutableDictionary* currGlyphDict;
    NSMutableArray* glyphPointArray;
    NSMutableDictionary* pushedKey;
    
    GLuint uMatrix;
}
@property double outputTime;
@property double outputTimeDelta;
@property NSRect frame;
@end
