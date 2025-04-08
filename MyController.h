//
//  MyController.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 8..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#ifndef MyController_h
#define MyController_h
@class MyOpenGLView;
@protocol Scene;
@protocol MyController <NSObject>

-(void) startDisplay;
-(void) setOutputTime : (double) outputTime;
-(void) loadSceneWithFrame : (NSRect)frame;
-(void) drawScene;
@property MyOpenGLView* targetView;
@property id<Scene> currentScene;
@end

#endif /* MyController_h */
