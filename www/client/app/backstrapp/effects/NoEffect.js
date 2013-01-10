define(['./Effect'], function (Effect) {

    var NoEffect = Effect.extend();
    NoEffect.prototype.play = function (fromView, toView, callback, context) {

        var $toView = toView && toView.$el,
        $fromView = fromView && fromView.$el;
        
        if($toView != $fromView){
            
            if ($toView)
                $toView.css( $toView.pushCSS || {'display': 'block'});

            if ($fromView)    
                $fromView.css('display', 'none');
        }
        callback.call(context);
            
    };

    return NoEffect;
});