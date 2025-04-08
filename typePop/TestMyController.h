//
//  MyContoller.h
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 8..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import "MyController.h"

@interface TestMyController : NSResponder<MyController>{
    MyOpenGLView* _targetView;
}
@property MyOpenGLView* targetView;
@property id<Scene> currentScene;
@end
