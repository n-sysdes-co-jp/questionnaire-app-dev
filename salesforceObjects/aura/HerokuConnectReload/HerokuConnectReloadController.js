// リロード処理、Heroku更新が重なった場合上書きされないようにするため、ボタンは画面に表示しない
({
    doInit : function(component, event, helper){

    },
	reloadBtn : function(component, event, helper) {
        var action = component.get("c.herokuConnectReload");
console.log('reloadBtn:start');
        action.setCallback(this, function(response){
            var state = response.getState();
            var resultObj = JSON.parse(JSON.stringify(response.getReturnValue()));
            console.log('reloadBtn:state:' + state);
            console.log('reloadBtn:resultObj:' + resultObj.result);
            console.log('reloadBtn:resultObj:' + resultObj.message);
            
            if(state === "SUCCESS" && resultObj.result === "true"){
                var toastEvent = $A.get("e.force:showToast");
                toastEvent.setParams({
                    "type": "success",
                    "title": "Success!",
                    "message": resultObj.message
                });
                toastEvent.fire();
                $A.get("e.force:closeQuickAction").fire();
            }
            else{
                var toastEvent = $A.get("e.force:showToast");
                toastEvent.setParams({
                    "type": "error",
                    "title": "Failed!",
                    "message": resultObj.message
                });
                toastEvent.fire();
                $A.get("e.force:closeQuickAction").fire();
            }
        });
        $A.enqueueAction(action);
	},
    cancelBtn : function(component, event, helper){
        $A.get("e.force:closeQuickAction").fire();
    }
})