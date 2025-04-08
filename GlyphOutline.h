//
//  GLyphOutline.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 3..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//
#import <ft2build.h>
#import <OpenGL/gl3.h>
#import FT_FREETYPE_H

#import <Foundation/Foundation.h>

@interface GlyphOutline : NSObject
- (id) initWithFace:(FT_Face) face;
- (void) loadVertex;
@property NSArray* vertexArray;
@property NSArray* rectArray;
@property GLuint wallArray;
@property GLuint vertexObject;
@property NSArray* contours;
@property NSArray* points;
@end
