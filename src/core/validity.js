(function(root){
  const PV=root.PV2000=root.PV2000||{};
  const REASONS=Object.freeze({
    MISSING_INPUT:'missing-input',
    CONTROLLER_SENTINEL:'controller-sentinel',
    INACTIVE_CHANNEL:'inactive-channel',
    NON_FINITE:'non-finite',
    NOT_COMPUTABLE:'not-computable',
    OUTSIDE_MEASURED_DOMAIN:'outside-measured-domain',
    PROFILE_REJECTED:'profile-rejected',
    UNSUPPORTED_PATH:'unsupported-path'
  });

  function state(value,{available=Number.isFinite(value),reason=null,rawValue=value}={}){
    const ok=!!available&&Number.isFinite(value);
    return{
      available:ok,
      reason:ok?null:(reason||REASONS.NON_FINITE),
      rawValue,
      value:ok?value:NaN
    };
  }

  function fromValues(values,{inactive=false,reason=null}={}){
    return Array.from(values||[],value=>inactive
      ?state(value,{available:false,reason:reason||REASONS.INACTIVE_CHANNEL})
      :state(value,{reason})
    );
  }

  function mask(states){
    return Array.from(states||[],item=>!!item?.available);
  }

  PV.validity={REASONS,state,fromValues,mask};
})(typeof window!=='undefined'?window:globalThis);
