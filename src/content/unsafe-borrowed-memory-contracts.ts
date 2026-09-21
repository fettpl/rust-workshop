export const borrowedBytesCanonical = String.raw`#[derive(Debug, PartialEq, Eq)]
struct BorrowedBytes<'owner> { bytes: &'owner [u8] }
impl<'owner> BorrowedBytes<'owner> {
    fn from_slice(owner: &'owner [u8]) -> Self { Self { bytes: owner } }
    fn reborrow<'short>(&'short self) -> BorrowedBytes<'short> { Self { bytes: self.bytes } }
    fn as_slice(&self) -> &[u8] { self.bytes }
}`;
export const borrowedBytesEquivalent = String.raw`#[derive(Debug, PartialEq, Eq)]
struct BorrowedBytes<'owner> { bytes: &'owner [u8] }
impl<'owner> BorrowedBytes<'owner> {
    fn from_slice(owner: &'owner [u8]) -> Self { let bytes = owner; Self { bytes } }
    fn reborrow<'short>(&'short self) -> BorrowedBytes<'short> { Self::from_slice(self.bytes) }
    fn as_slice(&self) -> &[u8] { &self.bytes[..] }
}`;
export const borrowedBytesMutant = borrowedBytesCanonical.replace("Self { bytes: owner }", "Self { bytes: &[] }");
export const borrowedBytesTests = String.raw`#[test]
fn preserves_bytes_and_reborrow() {
    let owner = [0_u8, 2, 255]; let view = BorrowedBytes::from_slice(&owner);
    assert_eq!(view.as_slice(), &[0, 2, 255]);
    assert_eq!(view.reborrow().as_slice(), view.as_slice());
}
#[test]
fn preserves_byte_length_for_unicode() {
    let owner = "zażółć".as_bytes().to_vec();
    assert_eq!(BorrowedBytes::from_slice(&owner).as_slice().len(), owner.len());
}`;

export const splitBorrowedCanonical = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }
fn split_borrowed<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    if mid > buffer.len() { return Err(SplitError::OutOfBounds); }
    Ok(buffer.split_at_mut(mid))
}`;
export const splitBorrowedEquivalent = String.raw`#[derive(Debug, PartialEq, Eq)]
enum SplitError { OutOfBounds }
fn split_borrowed<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError> {
    let tail = buffer.get(mid..).ok_or(SplitError::OutOfBounds)?;
    Ok(buffer.split_at_mut(buffer.len() - tail.len()))
}`;
export const splitBorrowedMutant = splitBorrowedCanonical.replace("mid > buffer.len()", "mid >= buffer.len()");
export const splitBorrowedTests = String.raw`#[test]
fn accepts_both_edges_and_rejects_only_out_of_bounds() {
    let mut data = [0_u8; 4]; let (left, right) = split_borrowed(&mut data, 0).unwrap();
    assert!(left.is_empty()); right[0] = 7; drop((left, right)); let len = data.len();
    let (left, right) = split_borrowed(&mut data, len).unwrap(); assert_eq!(left[0], 7); assert!(right.is_empty()); drop((left, right));
    assert_eq!(split_borrowed(&mut data, len + 1), Err(SplitError::OutOfBounds));
}
#[test]
fn writes_stay_disjoint() { let mut data = [0_u8; 4]; let (a,b)=split_borrowed(&mut data,2).unwrap(); a[1]=4; b[1]=9; assert_eq!(data,[0,4,0,9]); }`;

export const invariantBorrowCanonical = String.raw`use std::marker::PhantomData;
struct InvariantBorrow<'owner,T>{ value: &'owner mut T, life: PhantomData<fn(T)->T>, auto_traits: PhantomData<&'owner mut T> }
impl<'owner,T> InvariantBorrow<'owner,T>{
 fn from_mut(owner:&'owner mut T)->Self{Self{value:owner,life:PhantomData,auto_traits:PhantomData}}
 fn reborrow<'short>(&'short mut self)->InvariantBorrow<'short,T>{InvariantBorrow{value:&mut *self.value,life:PhantomData,auto_traits:PhantomData}}
 fn get(&self)->&T{self.value} fn get_mut(&mut self)->&mut T{self.value}
}`;
export const invariantBorrowEquivalent = String.raw`use std::marker::PhantomData;
struct InvariantBorrow<'owner,T>{value:&'owner mut T, marker:PhantomData<(&'owner mut T,fn(T)->T)>}
impl<'owner,T> InvariantBorrow<'owner,T>{
 fn from_mut(owner:&'owner mut T)->Self{Self{value:owner,marker:PhantomData}}
 fn reborrow<'short>(&'short mut self)->InvariantBorrow<'short,T>{let value:&'short mut T=&mut *self.value;InvariantBorrow{value,marker:PhantomData}}
 fn get(&self)->&T{&*self.value} fn get_mut(&mut self)->&mut T{&mut *self.value}
}`;
export const invariantBorrowMutant = invariantBorrowCanonical.replace("PhantomData<fn(T)->T>", "PhantomData<fn()->&'owner T>").replace("fn get_mut(&mut self)->&mut T{self.value}", "fn get_mut(&mut self)->&mut T{panic!(\"mutant\")}");
export const invariantBorrowTests = String.raw`#[test]
fn short_reborrow_preserves_outer_access(){let mut value=4;let mut slot=InvariantBorrow::from_mut(&mut value);{let mut short=slot.reborrow();*short.get_mut()+=3;}*slot.get_mut()+=2;assert_eq!(value,9);}
#[test]
fn holds_non_static_borrow(){let text=String::from("życie");let mut selected=text.as_str();let mut slot=InvariantBorrow::from_mut(&mut selected);assert_eq!(*slot.get(),"życie");*slot.reborrow().get_mut()="zmiana";assert_eq!(selected,"zmiana");}`;

export const safeSlotCanonical = String.raw`struct SafeSlot<T>{value:Option<T>}
impl<T> SafeSlot<T>{fn empty()->Self{Self{value:None}} fn put(&mut self,value:T)->Result<(),T>{if self.value.is_some(){Err(value)}else{self.value=Some(value);Ok(())}} fn take(&mut self)->Option<T>{self.value.take()} fn drop_initialized(&mut self){let _=self.value.take();} fn is_full(&self)->bool{self.value.is_some()}}`;
export const safeSlotEquivalent = String.raw`struct SafeSlot<T>{value:Option<T>}
impl<T> SafeSlot<T>{fn empty()->Self{Self{value:None}} fn put(&mut self,value:T)->Result<(),T>{match self.value{Some(_)=>Err(value),None=>{self.value=Some(value);Ok(())}}} fn take(&mut self)->Option<T>{let mut out=None;std::mem::swap(&mut self.value,&mut out);out} fn drop_initialized(&mut self){self.value=None;} fn is_full(&self)->bool{matches!(self.value,Some(_))}}`;
export const safeSlotMutant = safeSlotCanonical.replace("if self.value.is_some(){Err(value)}else{self.value=Some(value);Ok(())}", "self.value=Some(value);Ok(())");
export const safeSlotTests = String.raw`use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};
#[derive(Debug)] struct Probe(Arc<AtomicUsize>);impl Drop for Probe{fn drop(&mut self){self.0.fetch_add(1,Ordering::SeqCst);}}
#[test]fn state_and_drop_are_exact(){let d=Arc::new(AtomicUsize::new(0));{let mut s=SafeSlot::empty();s.put(Probe(d.clone())).unwrap();let v=s.take().unwrap();assert!(!s.is_full());drop(v);}assert_eq!(d.load(Ordering::SeqCst),1);}
#[test]fn second_put_is_rejected(){let d=Arc::new(AtomicUsize::new(0));let mut s=SafeSlot::empty();s.put(Probe(d.clone())).unwrap();drop(s.put(Probe(d.clone())).unwrap_err());assert_eq!(d.load(Ordering::SeqCst),1);s.drop_initialized();assert_eq!(d.load(Ordering::SeqCst),2);}`;

export const autoTraitsCanonical = invariantBorrowCanonical + String.raw`
fn assert_send<T:Send>(){} fn assert_sync<T:Sync>(){}
fn positive_bounds(){assert_send::<InvariantBorrow<'_,u8>>();assert_sync::<InvariantBorrow<'_,u8>>();}`;
export const autoTraitsEquivalent = invariantBorrowEquivalent + String.raw`
fn assert_send<T:Send>(){} fn assert_sync<T:Sync>(){}
fn positive_bounds(){assert_send::<InvariantBorrow<'_,u8>>();assert_sync::<InvariantBorrow<'_,u8>>();}`;
export const autoTraitsMutant = autoTraitsCanonical.replace("PhantomData<&'owner mut T>", "PhantomData<fn()->&'owner T>");
export const autoTraitsTests = String.raw`#[test]fn positive_bounds_compile(){positive_bounds();}
#[test]fn mutable_borrow_is_operational(){let mut v=8;let b=InvariantBorrow::from_mut(&mut v);assert_eq!(*b.get(),8);}`;

export const rawBorrowedPositive = String.raw`use std::slice;
struct RawBorrowed<'a>{bytes:&'a[u8]}
impl<'a> RawBorrowed<'a>{unsafe fn from_raw_parts_unchecked(raw:*const u8,len:usize)->Option<Self>{if len==0{return Some(Self{bytes:&[]});}if raw.is_null()||len>isize::MAX as usize{return None;}Some(Self{bytes:unsafe{slice::from_raw_parts(raw,len)}})}}`;
export const rawBorrowedEquivalent = rawBorrowedPositive.replace("if raw.is_null()||len>isize::MAX as usize{return None;}", "if len>isize::MAX as usize{return None;} let end=(raw as usize).checked_add(len)?; if raw.is_null()||end<raw as usize{return None;}");
export const rawBorrowedNegative = rawBorrowedPositive.replace("if raw.is_null()||len>isize::MAX as usize{return None;}", "if len>isize::MAX as usize{return None;}");
export const maybeUninitPositive = String.raw`use std::mem::MaybeUninit;
struct MaintainerSlot<T>{value:MaybeUninit<T>,full:bool}
impl<T> MaintainerSlot<T>{fn empty()->Self{Self{value:MaybeUninit::uninit(),full:false}}fn put(&mut self,v:T)->Result<(),T>{if self.full{Err(v)}else{self.value.write(v);self.full=true;Ok(())}}fn take(&mut self)->Option<T>{if !self.full{None}else{self.full=false;Some(unsafe{self.value.assume_init_read()})}}}impl<T>Drop for MaintainerSlot<T>{fn drop(&mut self){if self.full{unsafe{self.value.assume_init_drop();}}}}`;
export const maybeUninitEquivalent = maybeUninitPositive.replace("if !self.full{None}else{self.full=false;Some(unsafe{self.value.assume_init_read()})}", "match self.full{false=>None,true=>{self.full=false;Some(unsafe{self.value.assume_init_read()})}}");
export const maybeUninitNegative = maybeUninitPositive.replace("if self.full{unsafe{self.value.assume_init_drop();}}", "unsafe{self.value.assume_init_drop();}");
export const compileFailLifetime = String.raw`fn escape<'a>()->&'a[u8]{let owner=vec![1_u8,2];BorrowedBytes::from_slice(&owner).as_slice()}`;
export const compileFailInvariant = String.raw`fn write_short<'short>(slot:&mut InvariantBorrow<'static,&'static str>,value:&'short str){*slot.value=value}fn main(){}`;
export const compileFailCellSync = String.raw`use std::cell::Cell;fn assert_sync<T:Sync>(){}fn main(){assert_sync::<InvariantBorrow<'_,Cell<u8>>>();}`;
export const compileFailRcBounds = String.raw`use std::rc::Rc;fn assert_send<T:Send>(){}fn assert_sync<T:Sync>(){}fn main(){assert_send::<InvariantBorrow<'_,Rc<u8>>>();assert_sync::<InvariantBorrow<'_,Rc<u8>>>();}`;
