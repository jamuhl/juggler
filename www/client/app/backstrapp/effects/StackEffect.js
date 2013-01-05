define(['./Effect'], function (Effect) {

    var StackEffect = Effect.extend({
        
        back: false,
    
        play : function ($fromView, $toView, callback, context) {
            if ($toView) {
                
                // Showing the view
                var windowWidth = window.innerWidth;
                $toView.css('visibility', 'visible');
              //  $toView.css('left', windowWidth + 'px'); 
                  $toView.css('-webkit-transform', 'translate3d(' + windowWidth + 'px,0,0)'); 

                setTimeout(function(){
                   //$toView.css('-webkit-transform', 'translate3d(-' + windowWidth + 'px,0,0)');    
                   $toView.css('-webkit-transform', 'translate3d(0px,0,0)');    
      
                },0);
            }
            callback.call(context);
        }
    });
    return StackEffect;
});