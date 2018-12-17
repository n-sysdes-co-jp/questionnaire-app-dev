({
	doInit : function(component, event, helper) {
        var action = component.get("c.getPreviewInfo");
        console.log(component.get("v.recordId"));
        action.setParams({
            "questionnaireId" : component.get("v.recordId")
        });
        action.setCallback(this, function(response){
            var state = response.getState();
            if(state === "SUCCESS"){
                var previewUrl = response.getReturnValue();
                component.set("v.previewUrl", previewUrl);
            }
            else{
                var toastEvent = $A.get("e.force:showToast");
                toastEvent.setParams({
                    "title": "Failed!",
                    "message": resultObj.data
                });
                toastEvent.fire();
                $A.get("e.force:closeQuickAction").fire();
            }
        });
        $A.enqueueAction(action);
	}
})