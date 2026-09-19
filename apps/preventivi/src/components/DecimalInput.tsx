import { useEffect, useRef, useState } from 'react';
import { formatScaled, parseScaled } from '../domain/money';
export function DecimalInput({ value, decimals = 2, onChange, label, min = 0, max, onDirty, className = '' }: { value: number; decimals?: number; onChange: (value:number)=>void; label:string; min?:number; max?:number; onDirty?:()=>void; className?:string }) {
  const [text,setText]=useState(formatScaled(value,decimals).replace('.',','));const [error,setError]=useState('');const focused=useRef(false);const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(!focused.current){setText(formatScaled(value,decimals).replace('.',','));setError('');input.current?.setCustomValidity('');}},[value,decimals]);
  function change(next:string){setText(next);onDirty?.();try{const parsed=parseScaled(next,decimals);if(parsed<min)throw new Error('Valore troppo basso.');if(max!==undefined&&parsed>max)throw new Error('Valore troppo alto.');setError('');input.current?.setCustomValidity('');onChange(parsed);}catch(err){const message=err instanceof Error?err.message:'Numero non valido';setError(message);input.current?.setCustomValidity(message);}}
  return <span className={`decimal-input ${className}`}><input ref={input} type="text" inputMode="decimal" aria-label={label} aria-invalid={!!error} title={error||label} value={text} onFocus={()=>{focused.current=true;}} onBlur={()=>{focused.current=false;if(!error)setText(formatScaled(value,decimals).replace('.',','));}} onChange={e=>change(e.target.value)} required/>{error&&<small className="field-error">{error}</small>}</span>;
}
