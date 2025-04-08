//
//  TypePopController.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 9..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import "MyController.h"

@interface TypePopController : NSResponder<MyController>{
    MyOpenGLView* _targetView;
    double pastTime;
}
@property MyOpenGLView* targetView;
@property id<Scene> currentScene;
@end
