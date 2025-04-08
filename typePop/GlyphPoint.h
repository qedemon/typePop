//
//  GlyphPoint.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 10..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "Glyph.h"

@interface GlyphPoint : NSObject{
    float _pos[3];
    float _posV[3];
    float _axis[3];
}
@property float life;
@property float* posV;
@property float* pos;
@property float* axis;
@property float rotation;
@property float rotV;
@property(weak) Glyph* glyph;
-(void) update:(float)timeDelta;
@end
