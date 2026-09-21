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
export const borrowedBytesMutant = borrowedBytesCanonical.replace(
  "Self { bytes: owner }",
  "Self { bytes: &[] }",
);
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

export const borrowedBytesSoundnessCanonical = String.raw`struct OwnedSlice<'owner>{data:&'owner [u8]}
impl<'owner>OwnedSlice<'owner>{fn attach(data:&'owner [u8])->Self{Self{data}}fn shorten<'short>(&'short self)->OwnedSlice<'short>{OwnedSlice{data:self.data}}fn bytes(&self)->&[u8]{self.data}}`;
export const borrowedBytesSoundnessEquivalent = String.raw`struct OwnedSlice<'owner>{data:&'owner [u8]}
impl<'owner>OwnedSlice<'owner>{fn attach(data:&'owner [u8])->Self{let data=data;Self{data}}fn shorten<'short>(&'short self)->OwnedSlice<'short>{Self::attach(self.data)}fn bytes(&self)->&[u8]{&self.data[..]}}`;
export const borrowedBytesSoundnessMutant =
  borrowedBytesSoundnessCanonical.replace(
    "OwnedSlice{data:self.data}",
    "Self{data:&[]}",
  );
export const borrowedBytesSoundnessTests = String.raw`#[test]fn shortening_keeps_owner_bytes(){let owner=[0_u8,1,2,3];let view=OwnedSlice::attach(&owner);assert_eq!(view.shorten().bytes(),&owner);}
#[test]fn byte_length_is_not_character_length(){let owner="żółć".as_bytes().to_vec();assert_eq!(OwnedSlice::attach(&owner).bytes().len(),owner.len());}`;

export const borrowedWindowBlankCanonical = String.raw`struct BorrowedWindow<'owner>{owner:&'owner [u8]}
impl<'owner> BorrowedWindow<'owner>{fn new(owner:&'owner [u8])->Self{Self{owner}}fn tail(&self)->&[u8]{self.owner.get(1..).unwrap_or(&[])}fn bytes(&self)->&[u8]{self.owner}}`;
export const borrowedWindowBlankEquivalent = String.raw`struct BorrowedWindow<'owner>{owner:&'owner [u8]}
impl<'owner> BorrowedWindow<'owner>{fn new(owner:&'owner [u8])->Self{let view=owner;Self{owner:view}}fn tail(&self)->&[u8]{self.owner.get(1..).unwrap_or(&[])}fn bytes(&self)->&[u8]{&self.owner[..]}}`;
export const borrowedWindowBlankMutant = borrowedWindowBlankCanonical.replace(
  "fn tail(&self)->&[u8]{self.owner.get(1..).unwrap_or(&[])}",
  "fn tail(&self)->&[u8]{&self.owner[..1]}",
);
export const borrowedWindowBlankTests = String.raw`#[test]fn owner_bytes_and_tail_are_byte_based(){let owner="zażółć".as_bytes().to_vec();let view=BorrowedWindow::new(&owner);assert_eq!(view.bytes(),owner.as_slice());assert_eq!(view.tail(),&owner[1..]);}
#[test]fn empty_owner_has_no_tail(){let owner=Vec::new();let view=BorrowedWindow::new(&owner);assert!(view.tail().is_empty());}`;

export const borrowedTextReviewCanonical = String.raw`struct BorrowedText<'owner>{text:&'owner str}
impl<'owner> BorrowedText<'owner>{fn from_text(text:&'owner str)->Self{Self{text}}fn words(&self)->impl Iterator<Item=&'owner str>{self.text.split_whitespace()}fn raw(&self)->&'owner [u8]{self.text.as_bytes()}}`;
export const borrowedTextReviewEquivalent = String.raw`struct BorrowedText<'owner>{text:&'owner str}
impl<'owner> BorrowedText<'owner>{fn from_text(text:&'owner str)->Self{let text=text;Self{text}}fn words(&self)->impl Iterator<Item=&'owner str>{self.text.split_whitespace()}fn raw(&self)->&'owner [u8]{&self.text.as_bytes()[..]}}`;
export const borrowedTextReviewMutant = borrowedTextReviewCanonical.replace(
  "self.text.split_whitespace()",
  "self.text.split_whitespace().skip(1)",
);
export const borrowedTextReviewTests = String.raw`#[test]fn preserves_text_owner_and_raw_bytes(){let owner=String::from("pożyczone dane");let view=BorrowedText::from_text(&owner);assert_eq!(view.words().collect::<Vec<_>>(),vec!["pożyczone","dane"]);assert_eq!(view.raw(),owner.as_bytes());}`;

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
export const splitBorrowedMutant = splitBorrowedCanonical.replace(
  "mid > buffer.len()",
  "mid >= buffer.len()",
);
export const splitBorrowedTests = String.raw`#[test]
fn accepts_both_edges_and_rejects_only_out_of_bounds() {
    let mut data = [0_u8; 4]; let (left, right) = split_borrowed(&mut data, 0).unwrap();
    assert!(left.is_empty()); right[0] = 7; drop((left, right)); let len = data.len();
    let (left, right) = split_borrowed(&mut data, len).unwrap(); assert_eq!(left[0], 7); assert!(right.is_empty()); drop((left, right));
    assert_eq!(split_borrowed(&mut data, len + 1), Err(SplitError::OutOfBounds));
}
#[test]
fn writes_stay_disjoint() { let mut data = [0_u8; 4]; let (a,b)=split_borrowed(&mut data,2).unwrap(); a[1]=4; b[1]=9; assert_eq!(data,[0,4,0,9]); }`;

export const partitionWindowBlankCanonical = String.raw`#[derive(Debug,PartialEq,Eq)]enum CutError{TooLarge}
fn partition_window<'a>(input:&'a mut [u8],cut:usize)->Result<(&'a mut [u8],&'a mut [u8]),CutError>{let suffix=input.len().checked_sub(cut).ok_or(CutError::TooLarge)?;let split=input.len()-suffix;Ok(input.split_at_mut(split))}`;
export const partitionWindowBlankEquivalent = String.raw`#[derive(Debug,PartialEq,Eq)]enum CutError{TooLarge}
fn partition_window<'a>(input:&'a mut [u8],cut:usize)->Result<(&'a mut [u8],&'a mut [u8]),CutError>{let right=input.get(cut..).ok_or(CutError::TooLarge)?;Ok(input.split_at_mut(input.len()-right.len()))}`;
export const partitionWindowBlankMutant = partitionWindowBlankCanonical.replace(
  "let suffix=",
  "if cut>=input.len(){return Err(CutError::TooLarge)}let suffix=",
);
export const partitionWindowBlankTests = String.raw`#[test]fn cut_edges_are_valid(){let mut bytes=[0,1,2];let(_,right)=partition_window(&mut bytes,3).unwrap();assert!(right.is_empty());assert_eq!(partition_window(&mut bytes,4),Err(CutError::TooLarge));}
#[test]fn regions_are_disjoint(){let mut bytes=[0;4];let(left,right)=partition_window(&mut bytes,2).unwrap();left[1]=4;right[1]=9;assert_eq!(bytes,[0,4,0,9]);}`;

export const markerSplitReviewCanonical = String.raw`#[derive(Debug,PartialEq,Eq)]enum MarkerError{Missing}
fn split_on_marker<'a>(input:&'a mut [u8],marker:u8)->Result<(&'a mut [u8],&'a mut [u8]),MarkerError>{let index=input.iter().position(|byte|*byte==marker).ok_or(MarkerError::Missing)?;Ok(input.split_at_mut(index))}`;
export const markerSplitReviewEquivalent = String.raw`#[derive(Debug,PartialEq,Eq)]enum MarkerError{Missing}
fn split_on_marker<'a>(input:&'a mut [u8],marker:u8)->Result<(&'a mut [u8],&'a mut [u8]),MarkerError>{let index=input.iter().enumerate().find_map(|(index,byte)|(*byte==marker).then_some(index)).ok_or(MarkerError::Missing)?;Ok(input.split_at_mut(index))}`;
export const markerSplitReviewMutant = markerSplitReviewCanonical.replace(
  "position(|byte|*byte==marker)",
  "position(|byte|*byte!=marker)",
);
export const markerSplitReviewTests = String.raw`#[test]fn marker_preserves_prefix_and_suffix(){let mut bytes=[7,1,7];let(left,right)=split_on_marker(&mut bytes,1).unwrap();assert_eq!(left,[7]);assert_eq!(right,[1,7]);}
#[test]fn missing_marker_is_rejected(){let mut bytes=[7,7];assert_eq!(split_on_marker(&mut bytes,1),Err(MarkerError::Missing));}`;

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
export const invariantBorrowMutant = invariantBorrowCanonical.replace(
  "PhantomData<fn(T)->T>",
  "PhantomData<fn()->&'owner T>",
);
export const invariantVarianceMutant = String.raw`use std::marker::PhantomData;struct InvariantBorrow<'owner,T>{marker:PhantomData<fn()->T>,owner:PhantomData<&'owner ()>}`;
export const invariantBorrowTests = String.raw`#[test]
fn short_reborrow_preserves_outer_access(){let mut value=4;let mut slot=InvariantBorrow::from_mut(&mut value);{let mut short=slot.reborrow();*short.get_mut()+=3;}*slot.get_mut()+=2;assert_eq!(value,9);}
#[test]
fn holds_non_static_borrow(){let text=String::from("życie");let mut selected=text.as_str();let mut slot=InvariantBorrow::from_mut(&mut selected);assert_eq!(*slot.get(),"życie");*slot.reborrow().get_mut()="zmiana";assert_eq!(selected,"zmiana");}`;

export const safeSlotCanonical = String.raw`struct SafeSlot<T>{value:Option<T>}
impl<T> SafeSlot<T>{fn empty()->Self{Self{value:None}} fn put(&mut self,value:T)->Result<(),T>{if self.value.is_some(){Err(value)}else{self.value=Some(value);Ok(())}} fn take(&mut self)->Option<T>{self.value.take()} fn drop_initialized(&mut self){let _=self.value.take();} fn is_full(&self)->bool{self.value.is_some()}}`;
export const safeSlotEquivalent = String.raw`struct SafeSlot<T>{value:Option<T>}
impl<T> SafeSlot<T>{fn empty()->Self{Self{value:None}} fn put(&mut self,value:T)->Result<(),T>{match self.value{Some(_)=>Err(value),None=>{self.value=Some(value);Ok(())}}} fn take(&mut self)->Option<T>{let mut out=None;std::mem::swap(&mut self.value,&mut out);out} fn drop_initialized(&mut self){self.value=None;} fn is_full(&self)->bool{matches!(self.value,Some(_))}}`;
export const safeSlotMutant = safeSlotCanonical.replace(
  "if self.value.is_some(){Err(value)}else{self.value=Some(value);Ok(())}",
  "self.value=Some(value);Ok(())",
);
export const safeSlotTests = String.raw`use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};
#[derive(Debug)] struct Probe(Arc<AtomicUsize>);impl Drop for Probe{fn drop(&mut self){self.0.fetch_add(1,Ordering::SeqCst);}}
#[test]fn state_and_drop_are_exact(){let d=Arc::new(AtomicUsize::new(0));{let mut s=SafeSlot::empty();s.put(Probe(d.clone())).unwrap();let v=s.take().unwrap();assert!(!s.is_full());drop(v);}assert_eq!(d.load(Ordering::SeqCst),1);}
#[test]fn second_put_is_rejected(){let d=Arc::new(AtomicUsize::new(0));let mut s=SafeSlot::empty();s.put(Probe(d.clone())).unwrap();drop(s.put(Probe(d.clone())).unwrap_err());assert_eq!(d.load(Ordering::SeqCst),1);s.drop_initialized();assert_eq!(d.load(Ordering::SeqCst),2);}`;

export const safeSlotSoundnessCanonical = String.raw`struct OwnedCell<T>{state:Option<T>}
impl<T>OwnedCell<T>{fn open()->Self{Self{state:None}}fn insert(&mut self,value:T)->Result<(),T>{if self.state.is_some(){Err(value)}else{self.state=Some(value);Ok(())}}fn remove(&mut self)->Option<T>{let value=self.state.take();value}fn clear(&mut self){self.state.take();}}`;
export const safeSlotSoundnessEquivalent = String.raw`struct OwnedCell<T>{state:Option<T>}
impl<T>OwnedCell<T>{fn open()->Self{Self{state:None}}fn insert(&mut self,value:T)->Result<(),T>{match self.state{None=>{self.state=Some(value);Ok(())}Some(_)=>Err(value)}}fn remove(&mut self)->Option<T>{let mut out=None;std::mem::swap(&mut self.state,&mut out);out}fn clear(&mut self){let _=self.state.take();}}`;
export const safeSlotSoundnessMutant = safeSlotSoundnessCanonical.replace(
  "if self.state.is_some(){Err(value)}else{self.state=Some(value);Ok(())}",
  "self.state=Some(value);Ok(())",
);
export const safeSlotSoundnessTests = String.raw`use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};#[derive(Debug)]struct Counted(Arc<AtomicUsize>);impl Drop for Counted{fn drop(&mut self){self.0.fetch_add(1,Ordering::SeqCst);}}
#[test]fn duplicate_insert_and_clear_have_one_drop_each(){let drops=Arc::new(AtomicUsize::new(0));let mut cell=OwnedCell::open();cell.insert(Counted(drops.clone())).unwrap();drop(cell.insert(Counted(drops.clone())).unwrap_err());assert_eq!(drops.load(Ordering::SeqCst),1);drop(cell.remove());assert_eq!(drops.load(Ordering::SeqCst),2);cell.insert(Counted(drops.clone())).unwrap();cell.clear();assert_eq!(drops.load(Ordering::SeqCst),3);}`;

export const initCellBlankCanonical = String.raw`struct InitCell<T>{value:Option<T>}
impl<T>InitCell<T>{fn vacant()->Self{Self{value:None}}fn insert_once(&mut self,value:T)->Result<(),T>{if self.value.is_some(){Err(value)}else{self.value=Some(value);Ok(())}}fn remove(&mut self)->Option<T>{self.value.take()}fn occupied(&self)->bool{self.value.is_some()}}`;
export const initCellBlankEquivalent = String.raw`struct InitCell<T>{value:Option<T>}
impl<T>InitCell<T>{fn vacant()->Self{Self{value:None}}fn insert_once(&mut self,value:T)->Result<(),T>{match self.value{None=>{self.value=Some(value);Ok(())}Some(_)=>Err(value)}}fn remove(&mut self)->Option<T>{let mut out=None;std::mem::swap(&mut self.value,&mut out);out}fn occupied(&self)->bool{matches!(self.value,Some(_))}}`;
export const initCellBlankMutant = initCellBlankCanonical.replace(
  "if self.value.is_some(){Err(value)}else{self.value=Some(value);Ok(())}",
  "self.value=Some(value);Ok(())",
);
export const initCellBlankTests = String.raw`use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};#[derive(Debug)]struct DropProbe(Arc<AtomicUsize>);impl Drop for DropProbe{fn drop(&mut self){self.0.fetch_add(1,Ordering::SeqCst);}}
#[test]fn insert_remove_and_duplicate_are_exact(){let drops=Arc::new(AtomicUsize::new(0));let mut cell=InitCell::vacant();cell.insert_once(DropProbe(drops.clone())).unwrap();assert!(cell.occupied());drop(cell.insert_once(DropProbe(drops.clone())).unwrap_err());assert_eq!(drops.load(Ordering::SeqCst),1);drop(cell.remove());assert!(!cell.occupied());assert_eq!(drops.load(Ordering::SeqCst),2);}`;

export const leaseSlotReviewCanonical = String.raw`struct LeaseSlot<T>{item:Option<T>}
impl<T>LeaseSlot<T>{fn new()->Self{Self{item:None}}fn store(&mut self,item:T)->Result<(),T>{if self.item.is_some(){Err(item)}else{self.item=Some(item);Ok(())}}fn release(&mut self)->Option<T>{self.item.take()}fn clear(&mut self){self.item=None}}`;
export const leaseSlotReviewEquivalent = String.raw`struct LeaseSlot<T>{item:Option<T>}
impl<T>LeaseSlot<T>{fn new()->Self{Self{item:None}}fn store(&mut self,item:T)->Result<(),T>{match self.item{Some(_)=>Err(item),None=>{self.item=Some(item);Ok(())}}}fn release(&mut self)->Option<T>{let mut out=None;std::mem::swap(&mut self.item,&mut out);out}fn clear(&mut self){let _=self.item.take();}}`;
export const leaseSlotReviewMutant = leaseSlotReviewCanonical.replace(
  "if self.item.is_some(){Err(item)}else{self.item=Some(item);Ok(())}",
  "self.item=Some(item);Ok(())",
);
export const leaseSlotReviewTests = String.raw`use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};#[derive(Debug)]struct LeaseProbe(Arc<AtomicUsize>);impl Drop for LeaseProbe{fn drop(&mut self){self.0.fetch_add(1,Ordering::SeqCst);}}
#[test]fn release_and_clear_drop_once(){let drops=Arc::new(AtomicUsize::new(0));let mut slot=LeaseSlot::new();slot.store(LeaseProbe(drops.clone())).unwrap();drop(slot.store(LeaseProbe(drops.clone())).unwrap_err());assert_eq!(drops.load(Ordering::SeqCst),1);drop(slot.release());assert_eq!(drops.load(Ordering::SeqCst),2);slot.store(LeaseProbe(drops.clone())).unwrap();slot.clear();assert_eq!(drops.load(Ordering::SeqCst),3);}`;

export const autoTraitsCanonical =
  invariantBorrowCanonical +
  String.raw`
fn assert_send<T:Send>(){} fn assert_sync<T:Sync>(){}
fn positive_bounds(){assert_send::<InvariantBorrow<'_,u8>>();assert_sync::<InvariantBorrow<'_,u8>>();}`;
export const autoTraitsEquivalent =
  invariantBorrowEquivalent +
  String.raw`
fn assert_send<T:Send>(){} fn assert_sync<T:Sync>(){}
fn positive_bounds(){assert_send::<InvariantBorrow<'_,u8>>();assert_sync::<InvariantBorrow<'_,u8>>();}`;
export const autoTraitsMutant = `${autoTraitsCanonical}
unsafe impl<'owner,T> Sync for InvariantBorrow<'owner,T>{}`;
export const autoTraitsTests = String.raw`#[test]fn positive_bounds_compile(){positive_bounds();}
#[test]fn mutable_borrow_is_operational(){let mut v=8;let b=InvariantBorrow::from_mut(&mut v);assert_eq!(*b.get(),8);}
#[test]fn cell_is_send_but_not_sync_in_the_client_contract(){use std::cell::Cell;assert_send::<InvariantBorrow<'_,Cell<u8>>>();}`;

export const autoTraitsSoundnessCanonical =
  invariantBorrowCanonical +
  String.raw`
fn soundness_send<T:Send>(){} fn soundness_sync<T:Sync>(){}
fn soundness_bounds(){soundness_send::<InvariantBorrow<'_,u8>>();soundness_sync::<InvariantBorrow<'_,u8>>();}`;
export const autoTraitsSoundnessEquivalent =
  invariantBorrowEquivalent +
  String.raw`
fn soundness_send<T:Send>(){} fn soundness_sync<T:Sync>(){}
fn soundness_bounds(){soundness_send::<InvariantBorrow<'_,u8>>();soundness_sync::<InvariantBorrow<'_,u8>>();}`;
export const autoTraitsSoundnessMutant = `${autoTraitsSoundnessCanonical}
unsafe impl<'owner,T> Sync for InvariantBorrow<'owner,T>{}`;
export const autoTraitsSoundnessTests = String.raw`#[test]fn soundness_bounds_are_explicit(){soundness_bounds();}
#[test]fn soundness_reborrow_preserves_value(){let mut v=11;let view=InvariantBorrow::from_mut(&mut v);assert_eq!(*view.get(),11);}`;

export const cellMarkerBlankCanonical = String.raw`use std::marker::PhantomData;
struct CellMarker<'owner,T>{value:&'owner mut T,marker:PhantomData<fn(T)->T>,owner:PhantomData<&'owner mut T>}
impl<'owner,T>CellMarker<'owner,T>{fn borrow(value:&'owner mut T)->Self{Self{value,marker:PhantomData,owner:PhantomData}}fn get(&self)->&T{self.value}}`;
export const cellMarkerBlankEquivalent = String.raw`use std::marker::PhantomData;
struct CellMarker<'owner,T>{value:&'owner mut T,marker:PhantomData<(&'owner mut T,fn(T)->T)>}
impl<'owner,T>CellMarker<'owner,T>{fn borrow(value:&'owner mut T)->Self{let view=value;Self{value:view,marker:PhantomData}}fn get(&self)->&T{&*self.value}}`;
export const cellMarkerBlankMutant = `${cellMarkerBlankCanonical}
unsafe impl<'owner,T> Sync for CellMarker<'owner,T>{}`;
export const cellMarkerBlankTests = String.raw`fn assert_send<T:Send>(){}fn assert_sync<T:Sync>(){}
#[test]fn cell_send_positive(){use std::cell::Cell;assert_send::<CellMarker<'_,Cell<u8>>>();let mut value=Cell::new(3);assert_eq!(CellMarker::borrow(&mut value).get().get(),3);}`;
export const cellMarkerSyncClient = String.raw`use std::cell::Cell;fn assert_sync<T:Sync>(){}fn main(){assert_sync::<CellMarker<'_,Cell<u8>>>();}`;

export const traitViewReviewCanonical = String.raw`use std::marker::PhantomData;
struct TraitView<'owner,T>{value:&'owner mut T,ty:PhantomData<fn(T)->T>,owner:PhantomData<&'owner mut T>}
impl<'owner,T>TraitView<'owner,T>{fn attach(value:&'owner mut T)->Self{Self{value,ty:PhantomData,owner:PhantomData}}fn get(&self)->&T{self.value}fn reattach<'short>(&'short mut self)->TraitView<'short,T>{TraitView{value:&mut*self.value,ty:PhantomData,owner:PhantomData}}}`;
export const traitViewReviewEquivalent = String.raw`use std::marker::PhantomData;
struct TraitView<'owner,T>{value:&'owner mut T,marker:PhantomData<(&'owner mut T,fn(T)->T)>}
impl<'owner,T>TraitView<'owner,T>{fn attach(value:&'owner mut T)->Self{let value=value;Self{value,marker:PhantomData}}fn get(&self)->&T{&*self.value}fn reattach<'short>(&'short mut self)->TraitView<'short,T>{let value:&'short mut T=&mut*self.value;TraitView{value,marker:PhantomData}}}`;
export const traitViewReviewMutant = `${traitViewReviewCanonical}
unsafe impl<'owner,T> Sync for TraitView<'owner,T>{}`;
export const traitViewReviewTests = String.raw`fn assert_send<T:Send>(){}fn assert_sync<T:Sync>(){}
#[test]fn u8_bounds_and_reborrow_hold(){assert_send::<TraitView<'_,u8>>();assert_sync::<TraitView<'_,u8>>();let mut value=4;let mut view=TraitView::attach(&mut value);{let mut short=view.reattach();assert_eq!(*short.get(),4);}assert_eq!(*view.get(),4);}`;
export const traitViewSyncClient = String.raw`use std::cell::Cell;fn assert_sync<T:Sync>(){}fn main(){assert_sync::<TraitView<'_,Cell<u8>>>();}`;

export const rawBorrowedPositive = String.raw`use std::slice;
struct RawBorrowed<'a>{bytes:&'a[u8]}
impl<'a> RawBorrowed<'a>{unsafe fn from_raw_parts_unchecked(raw:*const u8,len:usize)->Option<Self>{if len==0{return Some(Self{bytes:&[]});}if raw.is_null()||len>isize::MAX as usize{return None;}Some(Self{bytes:unsafe{slice::from_raw_parts(raw,len)}})}}`;
export const rawBorrowedEquivalent = rawBorrowedPositive.replace(
  "if raw.is_null()||len>isize::MAX as usize{return None;}",
  "if len>isize::MAX as usize{return None;} let end=(raw as usize).checked_add(len)?; if raw.is_null()||end<raw as usize{return None;}",
);
export const rawBorrowedNegative = rawBorrowedPositive.replace(
  "if raw.is_null()||len>isize::MAX as usize{return None;}",
  "if len>isize::MAX as usize{return None;}",
);
export const rawAliasNegative = String.raw`use std::slice;
fn main(){let mut bytes=[1_u8,2];let first=unsafe{slice::from_raw_parts_mut(bytes.as_mut_ptr(),2)};let second=unsafe{slice::from_raw_parts_mut(bytes.as_mut_ptr(),2)};first[0]=3;second[0]=4;}`;
export const rawWrappedRangeNegative = String.raw`use std::slice;
fn main(){let _=unsafe{slice::from_raw_parts(usize::MAX as *const u8,2)};}`;
export const maybeUninitPositive = String.raw`use std::mem::MaybeUninit;
struct MaintainerSlot<T>{value:MaybeUninit<T>,full:bool}
impl<T> MaintainerSlot<T>{fn empty()->Self{Self{value:MaybeUninit::uninit(),full:false}}fn put(&mut self,v:T)->Result<(),T>{if self.full{Err(v)}else{self.value.write(v);self.full=true;Ok(())}}fn take(&mut self)->Option<T>{if !self.full{None}else{self.full=false;Some(unsafe{self.value.assume_init_read()})}}}impl<T>Drop for MaintainerSlot<T>{fn drop(&mut self){if self.full{unsafe{self.value.assume_init_drop();}}}}`;
export const maybeUninitEquivalent = maybeUninitPositive.replace(
  "if !self.full{None}else{self.full=false;Some(unsafe{self.value.assume_init_read()})}",
  "match self.full{false=>None,true=>{self.full=false;Some(unsafe{self.value.assume_init_read()})}}",
);
export const maybeUninitNegative = maybeUninitPositive.replace(
  "if self.full{unsafe{self.value.assume_init_drop();}}",
  "unsafe{self.value.assume_init_drop();}",
);
export const maybeUninitDoubleDropNegative = maybeUninitPositive.replace(
  "self.full=false;Some(unsafe{self.value.assume_init_read()})",
  "Some(unsafe{self.value.assume_init_read()})",
);
export const compileFailLifetime = String.raw`fn escape<'a>()->&'a[u8]{let owner=vec![1_u8,2];let view=BorrowedBytes::from_slice(&owner);view.as_slice()}
fn main(){let _escaped=escape();}`;
export const compileFailInvariant = String.raw`fn shorten<'short>(slot:InvariantBorrow<'static,&'static u8>,_borrow:&'short u8){let _shorter:InvariantBorrow<'static,&'short u8>=slot;}fn main(){let borrow=1u8;let slot:InvariantBorrow<'static,&'static u8>=unsafe{std::mem::MaybeUninit::zeroed().assume_init()};shorten(slot,&borrow);}`;
export const compileFailCellSync = String.raw`use std::cell::Cell;fn assert_sync<T:Sync>(){}fn main(){assert_sync::<InvariantBorrow<'_,Cell<u8>>>();}`;
export const autoTraitsCellSyncClient = String.raw`use std::cell::Cell;fn assert_cell_sync<T:Sync>(){}fn main(){assert_cell_sync::<InvariantBorrow<'_,Cell<u8>>>();}`;
export const compileFailRcBounds = String.raw`use std::rc::Rc;fn assert_send<T:Send>(){}fn assert_sync<T:Sync>(){}fn main(){assert_send::<InvariantBorrow<'_,Rc<u8>>>();assert_sync::<InvariantBorrow<'_,Rc<u8>>>();}`;
