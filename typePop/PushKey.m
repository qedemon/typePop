//
//  PushKey.m
//  typePop
//
//  Created by KimTaeseok on 2016. 1. 6..
//  Copyright © 2016년 KimTaeseok. All rights reserved.
//

#import "PushKey.h"

@implementation PushKey
-(id) initWithKey:(NSString*)key{
    self=[super init];
    if(self){
        self.key=key;
        self.time=1.0f;
    }
    return self;
}
@end
