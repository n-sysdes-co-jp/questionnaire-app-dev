({
    //設問テンプレートを取得
    doInit : function(component, event, helper){
        console.log('doInit1');
        var action = component.get("c.getQuestionMaster");
        console.log(component.get("v.recordId"));
        action.setParams({
            "questionnaireId" : component.get("v.recordId")
        });
        console.log('doInit1-2:');
        action.setCallback(this, function(response){
            var state = response.getState();
            console.log('doInit2:' + state);
            var resultObj = JSON.parse(JSON.stringify(response.getReturnValue()));
            console.log('getReturnValue:' + response.getReturnValue());
            console.log('obj:' + resultObj);
            console.log('obj.result:' + resultObj.result);
            console.log('obj.data:' + resultObj.data);
            if(state === "SUCCESS" && resultObj.result === "true"){
                console.log('doInit3:' + resultObj.data);
                component.set("v.jsonData", resultObj.data);
            }
            else{
                console.log('ERROR1:' + state);
                var toastEvent = $A.get("e.force:showToast");
                toastEvent.setParams({
                    "title": "Failed!",
                    "message": resultObj.data
                });
                toastEvent.fire();
                $A.get("e.force:closeQuickAction").fire();
            }
            console.log('doInit4:' + state);
        });
        console.log('doInit5:');
        $A.enqueueAction(action);
    },
    
    //引き込み処理
    createResList : function(component, event, helper) {
        var action = component.get("c.createQuestion");
        console.log('createQuestion1:' + component.get("v.jsonData"));
        console.log('createQuestion1:' + component.get("v.recordId"));
        action.setParams({
            "jsonData" : component.get("v.jsonData"),
            "questionnaireId" : component.get("v.recordId")
        });
        
        action.setCallback(this, function(response){
            var state = response.getState();
            console.log("state:" + state);
            if(state === "SUCCESS"){
                console.log('createQuestion1:' + response.getReturnValue());
                component.set("v.message", response.getReturnValue());
                var toastEvent = $A.get("e.force:showToast");
                toastEvent.setParams({
                    "type": "success",
                    "title": "Success!",
                    "message": response.getReturnValue()
                });
                toastEvent.fire();
                $A.get("e.force:closeQuickAction").fire();
                $A.get('e.force:refreshView').fire();
            }
            else{
                console.log('createQuestion1:' + response.getReturnValue());
                var toastEvent = $A.get("e.force:showToast");
                toastEvent.setParams({
                    "type": "error",
                    "title": "Failed!",
                    "message": response.getReturnValue()
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