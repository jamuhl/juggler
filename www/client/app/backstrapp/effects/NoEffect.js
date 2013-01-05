define(['./Effect'], function (Effect) {

    var NoEffect = Effect.extend();
    NoEffect.prototype.play = function ($fromView, $toView, callback, context) {
        
        if($toView != $fromView){
            
            if ($toView)
                $toView.css('display', 'block');

            if ($fromView)    
                $fromView.css('display', 'none');
        }
        callback.call(context);
            
    };

    return NoEffect;
});