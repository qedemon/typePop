//
//  Scene.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 8..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol Scene <NSObject>

@property double outputTime;
@property double outputTimeDelta;
@property NSRect frame;
- (id) initWithFrame:(NSRect)frame;
-(void) keyDown:(NSString*)key;
-(void) keyUp:(NSString*)key;
-(void) mouseDown:(NSPoint) point;
-(void) mouseUp:(NSPoint) point;
-(void) mouseDragged:(NSPoint) point;
-(void) loadContents;
-(void) drawScene;
@end
