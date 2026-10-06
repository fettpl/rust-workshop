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
fn partition_window<'a>(input:&'a mut [u8],cut:usize)->Result<(&'a mut [u8],&'a mut [u8]),CutError>{let prefix_len=input.len().checked_sub(cut).ok_or(CutError::TooLarge)?;Ok(input.split_at_mut(prefix_len))}`;
export const partitionWindowBlankEquivalent = String.raw`#[derive(Debug,PartialEq,Eq)]enum CutError{TooLarge}
fn partition_window<'a>(input:&'a mut [u8],cut:usize)->Result<(&'a mut [u8],&'a mut [u8]),CutError>{let prefix_len=input.len().checked_sub(cut).ok_or(CutError::TooLarge)?;let (left,right)=input.split_at_mut(prefix_len);Ok((left,right))}`;
export const partitionWindowBlankMutant = partitionWindowBlankCanonical.replace(
  "checked_sub(cut)",
  "checked_sub(cut+1)",
);
export const partitionWindowBlankTests = String.raw`#[test]fn cut_edges_are_valid(){let mut bytes=[0,1,2];let(left,right)=partition_window(&mut bytes,3).unwrap();assert!(left.is_empty());assert_eq!(right,&[0,1,2]);assert_eq!(partition_window(&mut bytes,4),Err(CutError::TooLarge));}
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
export const invariantBorrowSoundnessMutant = invariantBorrowCanonical.replace(
  "fn get_mut(&mut self)->&mut T{self.value}",
  "fn get_mut(&mut self)->&mut T{panic!(\"TODO: preserve mutable access\")}",
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

export const initCellBlankCanonical = String.raw`struct InitCell<T>{value:Option<T>,sealed:bool}
impl<T>InitCell<T>{fn vacant()->Self{Self{value:None,sealed:false}}fn insert_once(&mut self,value:T)->Result<(),T>{if self.sealed{Err(value)}else{self.value=Some(value);self.sealed=true;Ok(())}}fn remove(&mut self)->Option<T>{self.value.take()}fn occupied(&self)->bool{self.value.is_some()}}`;
export const initCellBlankEquivalent = String.raw`struct InitCell<T>{value:Option<T>,sealed:bool}
impl<T>InitCell<T>{fn vacant()->Self{Self{value:None,sealed:false}}fn insert_once(&mut self,value:T)->Result<(),T>{if self.sealed{Err(value)}else{self.value=Some(value);self.sealed=true;Ok(())}}fn remove(&mut self)->Option<T>{let mut out=None;std::mem::swap(&mut self.value,&mut out);out}fn occupied(&self)->bool{self.value.is_some()}}`;
export const initCellBlankMutant = initCellBlankCanonical.replace(
  "if self.sealed{Err(value)}else{self.value=Some(value);self.sealed=true;Ok(())}",
  "if self.value.is_some(){Err(value)}else{self.value=Some(value);Ok(())}",
);
export const initCellBlankTests = String.raw`use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};#[derive(Debug)]struct DropProbe(Arc<AtomicUsize>);impl Drop for DropProbe{fn drop(&mut self){self.0.fetch_add(1,Ordering::SeqCst);}}
#[test]fn insert_remove_and_duplicate_are_exact(){let drops=Arc::new(AtomicUsize::new(0));let mut cell=InitCell::vacant();cell.insert_once(DropProbe(drops.clone())).unwrap();assert!(cell.occupied());drop(cell.insert_once(DropProbe(drops.clone())).unwrap_err());assert_eq!(drops.load(Ordering::SeqCst),1);drop(cell.remove());assert!(!cell.occupied());assert_eq!(drops.load(Ordering::SeqCst),2);assert!(cell.insert_once(DropProbe(drops.clone())).is_err());}`;

export const leaseSlotReviewCanonical = String.raw`struct LeaseSlot<T>{item:Option<T>,generation:u64}
impl<T>LeaseSlot<T>{fn new()->Self{Self{item:None,generation:0}}fn store(&mut self,item:T)->Result<(),T>{if self.item.is_some(){Err(item)}else{self.item=Some(item);self.generation+=1;Ok(())}}fn release(&mut self)->Option<T>{let out=self.item.take();if out.is_some(){self.generation+=1;}out}fn clear(&mut self){if self.item.take().is_some(){self.generation+=1;}}fn generation(&self)->u64{self.generation}}`;
export const leaseSlotReviewEquivalent = String.raw`struct LeaseSlot<T>{item:Option<T>,generation:u64}
impl<T>LeaseSlot<T>{fn new()->Self{Self{item:None,generation:0}}fn store(&mut self,item:T)->Result<(),T>{match self.item{Some(_)=>Err(item),None=>{self.item=Some(item);self.generation+=1;Ok(())}}}fn release(&mut self)->Option<T>{let mut out=None;std::mem::swap(&mut self.item,&mut out);if out.is_some(){self.generation+=1;}out}fn clear(&mut self){if self.item.take().is_some(){self.generation+=1;}}fn generation(&self)->u64{self.generation}}`;
export const leaseSlotReviewMutant = leaseSlotReviewCanonical.replace(
  "if self.item.is_some(){Err(item)}else{self.item=Some(item);self.generation+=1;Ok(())}",
  "self.item=Some(item);Ok(())",
);
export const leaseSlotReviewTests = String.raw`use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};#[derive(Debug)]struct LeaseProbe(Arc<AtomicUsize>);impl Drop for LeaseProbe{fn drop(&mut self){self.0.fetch_add(1,Ordering::SeqCst);}}
#[test]fn release_and_clear_drop_once(){let drops=Arc::new(AtomicUsize::new(0));let mut slot=LeaseSlot::new();slot.store(LeaseProbe(drops.clone())).unwrap();assert_eq!(slot.generation(),1);drop(slot.store(LeaseProbe(drops.clone())).unwrap_err());assert_eq!(drops.load(Ordering::SeqCst),1);drop(slot.release());assert_eq!(drops.load(Ordering::SeqCst),2);assert_eq!(slot.generation(),2);slot.store(LeaseProbe(drops.clone())).unwrap();slot.clear();assert_eq!(drops.load(Ordering::SeqCst),3);assert_eq!(slot.generation(),4);}`;

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
export const autoTraitsRecallMutant = autoTraitsEquivalent
  .replace("PhantomData<(&'owner mut T,fn(T)->T)>", "PhantomData<*mut T>")
  .replace(
    "fn assert_send<T:Send>(){} fn assert_sync<T:Sync>(){}\nfn positive_bounds(){assert_send::<InvariantBorrow<'_,u8>>();assert_sync::<InvariantBorrow<'_,u8>>();}",
    "",
  );
export const autoTraitsRecallTests = String.raw`fn hidden_assert_send<T:Send>(){} fn hidden_assert_sync<T:Sync>(){}
#[test]fn positive_bounds_are_test_owned(){hidden_assert_send::<InvariantBorrow<'_,u8>>();hidden_assert_sync::<InvariantBorrow<'_,u8>>();hidden_assert_send::<InvariantBorrow<'_,std::cell::Cell<u8>>>();}
#[test]fn mutable_reborrow_is_operational(){let mut v=8;let mut parent=InvariantBorrow::from_mut(&mut v);{let mut child=parent.reborrow();*child.get_mut()+=2;}assert_eq!(*parent.get(),10);}`;
export const autoTraitsMutant = `${autoTraitsCanonical}
unsafe impl<'owner,T> Sync for InvariantBorrow<'owner,T>{}`;
export const autoTraitsTests = String.raw`fn hidden_assert_send<T:Send>(){} fn hidden_assert_sync<T:Sync>(){}
fn hidden_positive_bounds(){hidden_assert_send::<InvariantBorrow<'_,u8>>();hidden_assert_sync::<InvariantBorrow<'_,u8>>();hidden_assert_send::<InvariantBorrow<'_,std::cell::Cell<u8>>>();}
#[test]fn positive_bounds_compile(){hidden_positive_bounds();}
#[test]fn sync_bound_is_explicit(){hidden_assert_sync::<InvariantBorrow<'_,u8>>();}
#[test]fn mutable_borrow_is_operational(){let mut v=8;let b=InvariantBorrow::from_mut(&mut v);assert_eq!(*b.get(),8);}
#[test]fn scoped_reborrow_preserves_parent_access(){let mut v=8;let mut parent=InvariantBorrow::from_mut(&mut v);{let mut child=parent.reborrow();*child.get_mut()+=2;}*parent.get_mut()+=1;assert_eq!(v,11);}
#[test]fn cell_is_send_in_the_client_contract(){use std::cell::Cell;hidden_assert_send::<InvariantBorrow<'_,Cell<u8>>>();}`;
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
export const autoTraitsSoundnessTests = String.raw`fn hidden_soundness_send<T:Send>(){} fn hidden_soundness_sync<T:Sync>(){}
#[test]fn soundness_bounds_are_explicit(){hidden_soundness_send::<InvariantBorrow<'_,u8>>();hidden_soundness_sync::<InvariantBorrow<'_,u8>>();hidden_soundness_send::<InvariantBorrow<'_,std::cell::Cell<u8>>>();}
#[test]fn soundness_reborrow_preserves_value(){let mut v=11;let view=InvariantBorrow::from_mut(&mut v);assert_eq!(*view.get(),11);}
#[test]fn scoped_reborrow_preserves_parent_access(){let mut v=11;let mut parent=InvariantBorrow::from_mut(&mut v);{let mut child=parent.reborrow();*child.get_mut()+=2;}*parent.get_mut()+=1;assert_eq!(v,14);}`;

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

export const byteSpanTransferCanonical = String.raw`struct ByteSpan<'owner>{owner:&'owner [u8],start:usize,len:usize}
impl<'owner>ByteSpan<'owner>{fn from_range(owner:&'owner [u8],start:usize,len:usize)->Option<Self>{let end=start.checked_add(len)?;if end>owner.len(){None}else{Some(Self{owner,start,len})}}fn subspan<'short>(&'short self,start:usize,len:usize)->Option<ByteSpan<'short>>{let end=start.checked_add(len)?;if end>self.len{None}else{Some(ByteSpan{owner:&self.owner[self.start..self.start+self.len],start,len})}}fn bytes(&self)->&[u8]{&self.owner[self.start..self.start+self.len]}}`;
export const byteSpanTransferEquivalent = String.raw`struct ByteSpan<'owner>{owner:&'owner [u8],start:usize,len:usize}
impl<'owner>ByteSpan<'owner>{fn from_range(owner:&'owner [u8],start:usize,len:usize)->Option<Self>{if start>owner.len(){return None;}let end=start.checked_add(len)?;owner.get(start..end).map(|_|Self{owner,start,len})}fn subspan<'short>(&'short self,start:usize,len:usize)->Option<ByteSpan<'short>>{let view=self.bytes();let end=start.checked_add(len)?;view.get(start..end).map(|_|ByteSpan{owner:view,start,len})}fn bytes(&self)->&[u8]{&self.owner[self.start..self.start+self.len]}}`;
export const byteSpanTransferMutant = byteSpanTransferCanonical.replace(
  "let end=start.checked_add(len)?;if end>owner.len(){None}else{Some(Self{owner,start,len})}",
  "let end=start.wrapping_add(len);if end>owner.len(){None}else{Some(Self{owner,start,len})}",
);
export const byteSpanTransferTests = String.raw`#[test]fn nested_ranges_keep_bytes_and_identity(){let owner=[0_u8,255,2,3];let span=ByteSpan::from_range(&owner,1,2).unwrap();assert_eq!(span.bytes(),&[255,2]);let nested=span.subspan(1,1).unwrap();assert_eq!(nested.bytes(),&[2]);assert!(std::ptr::eq(nested.bytes().as_ptr(),owner[2..].as_ptr()));}
#[test]fn invalid_and_empty_ranges_are_explicit(){let owner=[1_u8,2];assert!(ByteSpan::from_range(&owner,2,0).is_some());assert!(ByteSpan::from_range(&owner,3,0).is_none());assert!(ByteSpan::from_range(&owner,usize::MAX,1).is_none());assert!(ByteSpan::from_range(&owner,0,usize::MAX).is_none());let span=ByteSpan::from_range(&owner,1,1).unwrap();assert!(span.subspan(1,0).is_some());assert!(span.subspan(2,0).is_none());}
#[test]fn raw_bytes_are_not_decoded_or_copied(){let owner=[0xff_u8,0];let span=ByteSpan::from_range(&owner,0,2).unwrap();assert_eq!(span.bytes(),&[0xff,0]);}`;

export const pairLoanTransferCanonical = String.raw`struct PairLoan<'owner,T>{owner:&'owner mut (T,T)}
impl<'owner,T>PairLoan<'owner,T>{fn attach(owner:&'owner mut (T,T))->Self{Self{owner}}fn reborrow<'short>(&'short mut self)->PairLoan<'short,T>{PairLoan{owner:&mut*self.owner}}fn swap(&mut self){std::mem::swap(&mut self.owner.0,&mut self.owner.1)}fn values(&self)->(&T,&T){(&self.owner.0,&self.owner.1)}}`;
export const pairLoanTransferEquivalent = String.raw`struct PairLoan<'owner,T>{owner:&'owner mut (T,T)}
impl<'owner,T>PairLoan<'owner,T>{fn attach(owner:&'owner mut (T,T))->Self{let owner=owner;Self{owner}}fn reborrow<'short>(&'short mut self)->PairLoan<'short,T>{let owner:&'short mut(T,T)=&mut*self.owner;PairLoan{owner}}fn swap(&mut self){let(left,right)=(&mut self.owner.0,&mut self.owner.1);std::mem::swap(left,right)}fn values(&self)->(&T,&T){let pair=&*self.owner;(&pair.0,&pair.1)}}`;
export const pairLoanTransferMutant = pairLoanTransferCanonical.replace(
  "fn reborrow<'short>(&'short mut self)->PairLoan<'short,T>{PairLoan{owner:&mut*self.owner}}",
  "fn reborrow<'short>(&'short mut self)->PairLoan<'short,T>{panic!(\"TODO: preserve pair reborrow\")}",
);
export const pairLoanTransferTests = String.raw`#[test]fn child_swap_then_parent_use(){let mut pair=(String::from("left"),String::from("right"));let mut loan=PairLoan::attach(&mut pair);{let mut child=loan.reborrow();child.swap();assert_eq!(child.values().0,"right");}assert_eq!(loan.values().0,"right");loan.swap();assert_eq!(loan.values().0,"left");}
#[test]fn two_swaps_restore_owner(){let mut pair=(1_u8,2_u8);let mut loan=PairLoan::attach(&mut pair);loan.swap();loan.swap();assert_eq!(loan.values(),(&1,&2));}`;

export const replaceSlotTransferCanonical = String.raw`struct ReplaceSlot<T>{value:Option<T>}
impl<T>ReplaceSlot<T>{fn empty()->Self{Self{value:None}}fn replace(&mut self,value:T)->Option<T>{self.value.replace(value)}fn take_if(&mut self,predicate:impl FnOnce(&T)->bool)->Option<T>{if self.value.as_ref().is_some_and(predicate){self.value.take()}else{None}}fn clear(&mut self){self.value=None}fn is_full(&self)->bool{self.value.is_some()}}`;
export const replaceSlotTransferEquivalent = String.raw`struct ReplaceSlot<T>{value:Option<T>}
impl<T>ReplaceSlot<T>{fn empty()->Self{Self{value:None}}fn replace(&mut self,value:T)->Option<T>{let old=self.value.take();self.value=Some(value);old}fn take_if(&mut self,predicate:impl FnOnce(&T)->bool)->Option<T>{match self.value.as_ref(){Some(value) if predicate(value)=>self.value.take(),_=>None}}fn clear(&mut self){let _=self.value.take();}fn is_full(&self)->bool{matches!(self.value,Some(_))}}`;
export const replaceSlotTransferMutant = replaceSlotTransferCanonical.replace(
  "if self.value.as_ref().is_some_and(predicate){self.value.take()}else{None}",
  "if self.value.is_some(){self.value.take()}else{None}",
);
export const replaceSlotTransferTests = String.raw`use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};struct DropProbe(Arc<AtomicUsize>);impl Drop for DropProbe{fn drop(&mut self){self.0.fetch_add(1,Ordering::SeqCst);}}
#[test]fn empty_skips_predicate_and_replacement_returns_old(){let drops=Arc::new(AtomicUsize::new(0));let mut slot=ReplaceSlot::empty();let mut called=0;assert!(slot.take_if(|_|{called+=1;true}).is_none());assert_eq!(called,0);slot.replace(DropProbe(drops.clone()));let old=slot.replace(DropProbe(drops.clone())).unwrap();drop(old);assert_eq!(drops.load(Ordering::SeqCst),1);slot.clear();assert_eq!(drops.load(Ordering::SeqCst),2);}
#[test]fn false_keeps_and_true_takes_once(){let drops=Arc::new(AtomicUsize::new(0));let mut slot=ReplaceSlot::empty();slot.replace(DropProbe(drops.clone()));assert!(slot.take_if(|_|false).is_none());assert!(slot.is_full());drop(slot.take_if(|_|true));assert!(!slot.is_full());assert_eq!(drops.load(Ordering::SeqCst),1);slot.clear();assert_eq!(drops.load(Ordering::SeqCst),1);}`;

export const sharedLeaseTransferCanonical = String.raw`struct SharedLease<'owner,T>{value:&'owner T}
impl<'owner,T>SharedLease<'owner,T>{fn attach(value:&'owner T)->Self{Self{value}}fn reborrow<'short>(&'short self)->SharedLease<'short,T>{SharedLease{value:self.value}}fn get(&self)->&T{self.value}}`;
export const sharedLeaseTransferEquivalent = String.raw`struct SharedLease<'owner,T>{value:&'owner T}
impl<'owner,T>SharedLease<'owner,T>{fn attach(value:&'owner T)->Self{let value=value;Self{value}}fn reborrow<'short>(&'short self)->SharedLease<'short,T>{Self::attach(self.value)}fn get(&self)->&T{&*self.value}}`;
export const sharedLeaseTransferMutant = sharedLeaseTransferCanonical.replace(
  "fn reborrow<'short>(&'short self)->SharedLease<'short,T>{SharedLease{value:self.value}}",
  "fn reborrow<'short>(&'short self)->SharedLease<'short,T>{panic!(\"TODO: preserve shared reborrow\")}",
);
export const sharedLeaseTransferTests = String.raw`fn require_send<T:Send>(){}fn require_sync<T:Sync>(){}
#[test]fn positive_bounds_and_pointer_identity(){require_send::<SharedLease<'_,u8>>();require_sync::<SharedLease<'_,u8>>();let value=String::from("pożyczka");let lease=SharedLease::attach(&value);assert!(std::ptr::eq(lease.get(),&value));let short=lease.reborrow();assert!(std::ptr::eq(short.get(),&value));assert_eq!(short.get(),"pożyczka");}
#[test]fn shared_reborrow_keeps_non_static_data(){let value=String::from("lokalne");let lease=SharedLease::attach(&value);assert_eq!(lease.reborrow().get(),"lokalne");}`;

export const rawBorrowedPositive = String.raw`use std::slice;
struct RawBorrowed<'a>{bytes:&'a[u8]}
impl<'a> RawBorrowed<'a>{
/// # Safety
/// For a non-empty slice, the caller must provide a properly aligned,
/// non-null pointer to the first byte of one live allocation containing at least
/// len initialized u8 values. The allocation size must fit in isize and pointer
/// arithmetic for the whole range must stay within that allocation. The caller
/// must keep that allocation alive for 'a, avoid mutable or exclusive aliases
/// for 'a, and ensure the returned shared slice is not used after invalidation.
unsafe fn from_raw_parts_unchecked(raw:*const u8,len:usize)->Option<Self>{if len==0{return Some(Self{bytes:&[]});}if raw.is_null()||len>isize::MAX as usize{return None;}Some(Self{bytes:unsafe{
// SAFETY: The function's caller contract above establishes alignment,
// provenance, initialization, range, aliasing and lifetime for this slice.
slice::from_raw_parts(raw,len)}})}}`;
export const rawBorrowedEquivalent = rawBorrowedPositive.replace(
  "if raw.is_null()||len>isize::MAX as usize{return None;}",
  "if len>isize::MAX as usize{return None;} let end=(raw as usize).checked_add(len)?; if raw.is_null()||end<raw as usize{return None;}",
);
export const rawBorrowedNegative = rawBorrowedPositive
  .replace(
    "if raw.is_null()||len>isize::MAX as usize{return None;}",
    "if len>isize::MAX as usize{return None;}",
  )
  .replace(
    "impl<'a> RawBorrowed<'a>{",
    "impl<'a> RawBorrowed<'a>{\n// INTENTIONALLY UB NEGATIVE FIXTURE: maintainer-only Miri input; never execute\n// as learner code. It passes a null pointer for a non-empty slice.",
  )
  .replace(
    "// SAFETY: The function's caller contract above establishes alignment,\n// provenance, initialization, range, aliasing and lifetime for this slice.",
    "// INTENTIONALLY UB NEGATIVE FIXTURE: this call violates the caller contract\n// by passing a null pointer for a non-empty slice; Miri must reject it.",
  );
export const rawAliasNegative = String.raw`use std::slice;
// INTENTIONALLY UB NEGATIVE FIXTURE: maintainer-only Miri input; never execute
// as learner code. It creates overlapping mutable slices from one allocation.
fn main(){let mut bytes=[1_u8,2];let first=unsafe{slice::from_raw_parts_mut(bytes.as_mut_ptr(),2)};let second=unsafe{slice::from_raw_parts_mut(bytes.as_mut_ptr(),2)};first[0]=3;second[0]=4;}`;
export const rawWrappedRangeNegative = String.raw`use std::slice;
// INTENTIONALLY UB NEGATIVE FIXTURE: maintainer-only Miri input; never execute
// as learner code. The fabricated pointer is outside any live allocation.
fn main(){let _=unsafe{slice::from_raw_parts(usize::MAX as *const u8,2)};}`;
export const maybeUninitPositive = String.raw`use std::mem::MaybeUninit;
// Invariant: full == false means value is uninitialized and must never be read
// or dropped; full == true means value contains exactly one initialized T. The
// private fields and methods preserve this state, so every T is moved or
// dropped at most once.
struct MaintainerSlot<T>{value:MaybeUninit<T>,full:bool}
impl<T> MaintainerSlot<T>{fn empty()->Self{Self{value:MaybeUninit::uninit(),full:false}}fn put(&mut self,v:T)->Result<(),T>{if self.full{Err(v)}else{self.value.write(v);self.full=true;Ok(())}}fn take(&mut self)->Option<T>{if !self.full{None}else{self.full=false;Some(unsafe{
// SAFETY: full was true immediately before it was cleared, so this slot
// contained exactly one initialized T and this read moves it exactly once.
self.value.assume_init_read()})}}}impl<T>Drop for MaintainerSlot<T>{fn drop(&mut self){if self.full{unsafe{
// SAFETY: full means the slot still owns its one initialized T; dropping it
// here consumes that value exactly once before the storage is discarded.
self.value.assume_init_drop();}}}}`;
export const maybeUninitEquivalent = maybeUninitPositive.replace(
  "if !self.full{None}else{self.full=false;Some(unsafe{\n// SAFETY: full was true immediately before it was cleared, so this slot\n// contained exactly one initialized T and this read moves it exactly once.\nself.value.assume_init_read()})}",
  "match self.full{false=>None,true=>{self.full=false;Some(unsafe{\n// SAFETY: full was true immediately before it was cleared, so this slot\n// contained exactly one initialized T and this read moves it exactly once.\nself.value.assume_init_read()})}}",
);
export const maybeUninitNegative = maybeUninitPositive.replace(
  "if !self.full{None}else{self.full=false;Some(unsafe{\n// SAFETY: full was true immediately before it was cleared, so this slot\n// contained exactly one initialized T and this read moves it exactly once.\nself.value.assume_init_read()})}",
  "self.full=false;Some(unsafe{\n// INTENTIONALLY UB NEGATIVE FIXTURE: full is false here, so this reads an\n// uninitialized slot. This maintainer-only Miri input never runs as learner code.\nself.value.assume_init_read()})",
);
export const maybeUninitDoubleDropNegative = maybeUninitPositive
  .replace(
    "self.full=false;Some(unsafe{\n// SAFETY: full was true immediately before it was cleared, so this slot\n// contained exactly one initialized T and this read moves it exactly once.\nself.value.assume_init_read()})",
    "Some(unsafe{\n// INTENTIONALLY UB NEGATIVE FIXTURE: the state is not cleared after this move,\n// so a later read/drop can use the value again. Maintainer-only Miri input.\nself.value.assume_init_read()})",
  )
  .replace(
    "// SAFETY: full means the slot still owns its one initialized T; dropping it\n// here consumes that value exactly once before the storage is discarded.",
    "// INTENTIONALLY UB NEGATIVE FIXTURE: the slot state still claims ownership\n// after the first move, so a later read or drop observes a moved value; Miri must reject it.",
  );
export const compileFailLifetime = String.raw`fn escape<'a>()->&'a[u8]{let owner=vec![1_u8,2];let view=BorrowedBytes::from_slice(&owner);view.as_slice()}
fn main(){let _escaped=escape();}`;
export const compileFailInvariant = String.raw`fn shorten<'short>(slot:InvariantBorrow<'static,&'static u8>,_borrow:&'short u8){let _shorter:InvariantBorrow<'static,&'short u8>=slot;}fn main(){let borrow=1u8;let slot:InvariantBorrow<'static,&'static u8>=unsafe{std::mem::MaybeUninit::zeroed().assume_init()};shorten(slot,&borrow);}`;
export const compileFailCellSync = String.raw`use std::cell::Cell;fn assert_sync<T:Sync>(){}fn main(){assert_sync::<InvariantBorrow<'_,Cell<u8>>>();}`;
export const autoTraitsCellSyncClient = String.raw`use std::cell::Cell;fn assert_cell_sync<T:Sync>(){}fn main(){assert_cell_sync::<InvariantBorrow<'_,Cell<u8>>>();}`;
export const compileFailRcBounds = String.raw`use std::rc::Rc;fn assert_send<T:Send>(){}fn assert_sync<T:Sync>(){}fn main(){assert_send::<InvariantBorrow<'_,Rc<u8>>>();assert_sync::<InvariantBorrow<'_,Rc<u8>>>();}`;
