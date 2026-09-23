(function(root){
  const PV=root.PV2000=root.PV2000||{};
  const PROVENANCE=Object.freeze({
    RAW:'raw',
    STORED_CONTROLLER:'stored-controller',
    CORRECTED:'corrected',
    DERIVED_PHYSICAL:'derived-physical',
    DERIVED_COMPATIBILITY:'derived-compatibility',
    ANALYZER_OPTIONAL:'analyzer-optional'
  });
  const VALIDATION=Object.freeze({
    VALIDATED:'validated',
    REPRODUCED:'reproduced-at-shown-precision',
    INFERRED:'inferred',
    UNSUPPORTED:'unsupported'
  });

  function create({
    id,
    key=id,
    label=id,
    short=label,
    unit='',
    values=[],
    provenance=PROVENANCE.RAW,
    availability=null,
    modelId=null,
    profileId=null,
    validation=VALIDATION.INFERRED,
    help=''
  }={}){
    if(!id)throw new Error('Quantity id is required.');
    const data=Array.from(values||[]),
      states=availability?Array.from(availability):PV.validity.fromValues(data);
    if(states.length!==data.length)throw new Error(`Quantity ${id} availability length does not match values.`);
    return{
      id,
      key,
      label,
      short,
      unit,
      values:data,
      provenance,
      availability:states,
      modelId,
      profileId,
      validation,
      help
    };
  }

  function availableValues(quantity){
    if(!quantity)return[];
    return quantity.values.filter((value,index)=>quantity.availability?.[index]?.available??Number.isFinite(value));
  }

  function summary(quantity){
    return PV.stats.summary(availableValues(quantity));
  }

  PV.quantity={PROVENANCE,VALIDATION,create,availableValues,summary};
})(typeof window!=='undefined'?window:globalThis);
