//
//  AppDelegate.h
//  typePop
//
//  Created by KimTaeseok on 2015. 11. 29..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import "MyWindow.h"
#import "MyOpenGLView.h"
#import "TypePopController.h"

@interface AppDelegate : NSObject <NSApplicationDelegate>{
    MyOpenGLView *targetView;
    TypePopController *controller;
    MyWindow* fullScreenWindow;
}

@end

