//
//  Glyph.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 2..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//
#import <ft2build.h>
#import FT_FREETYPE_H
#import <OpenGL/gl3.h>
#import <Foundation/Foundation.h>
#import "GlyphOutline.h"

@interface Glyph : NSObject


-(id) initWithFace:(FT_Face) face;
+(float) keyWidth;
+(float) keyBoardWidth;
+(NSMutableDictionary*) loadDefaultGlyphWithEnFace:(FT_Face) enFace AndKoFace:(FT_Face) koFace;
@property float scale;
@property NSRect rect;
//@property GLuint tex;
@property GlyphOutline* outline;
@property float keyPos;
@end
