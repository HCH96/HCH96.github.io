---
title: 언리얼 컨테이너 라이브러리Ⅲ- UStruct, TMap
date: 2025-08-28 18:40:00 +09:00
categories: [Unreal, 언리얼 c++의 이해]
published: true
tags:
  [unreal, cpp, ustruct, tmap]
---

## UStruct
UStruct는 언리얼 리플렉션 시스템에 등록된 구조체 타입이다. 데이터 묶음을 표현하면서, 언리얼의 GC/에디터/블루프린트/네트워킹과 호환이 가능하다. 내부적으로 UObject처럼 UStruct 메타데이터가 관리되지만, UObject처럼 힙에 올려서 생성되는 게 아니라 값 타입으로 사용된다.

- `UStruct`는 값 타입(value type) 이기 때문에 가비지 컬렉션(GC)의 관리 대상이 아니다. 따라서 스택 변수나 클래스의 멤버 변수로 자유롭게 선언해서 사용할 수 있으며, UObject처럼 NewObject<>와 같은 엔진 전용 생성 함수를 거칠 필요도 없다.
- `USTRUCT`와 `UPROPERTY`를 통해 에디터에 노출, 직렬화, 블루프린트 노출, 저장/로드 등이 가능하다.
- UStruct 자체는 값 타입이기 때문에 GC대상이 아니다. 하지만 `UObject*`를 멤버로 가지고 있을 경우 UPROPERTY()로 표시하여 GC가 관리하도록 해야한다.
- `UStruct` 자체는 네트워크 리플리케이션 대상이 아니지만, 그 안에 선언된 `UPROPERTY` 멤버 변수들은 리플리케이션 시스템에 의해 추적되고 동기화될 수 있다.
- `UFUNCTION은` 리플렉션 시스템에 등록되는 매크로인데, 리플렉션은 UObject/UClass 단위로만 관리되므로 UStruct에는 사용할 수 없다.

### 구현

```cpp
	USTRUCT()
	struct FStructName
	{
		GENERATED_BODY()
	};
```

- 구조체에는 `Atomic`, `BlueprintType`, `NoExport가` 같은 지정자를 사용할 수 있다.
- `GENERATED_BODY` 매크로를 선언하면 리플렉션, 직렬화 등의 언리얼 엔진 기능을 지원받을 수 있다.
- `GENERATED_BODY`가 선언된 구조체는 내부적으로 `UScriptStruct로` 구현된다. `UScriptStruct는` `UClass와` 달리 `UFUNCTION을` 지원하지 않으며, 이는 구조체를 데이터 묶음 전용으로 설계해 불필요한 오버헤드를 줄이기 위함이다.
- 언리얼의 코딩 컨벤션에 따라 구조체 이름은 접두사 F로 시작한다.

![alt text](/assets/img/unreal/TMap/image.png)

---

## TMap

`TMap`은 키와 값의 쌍을 빠르게 `저장`, `검색`, `삭제`할 수 있는 해시 기반 컨테이너이다.
키는 고유해야 하며, 값은 키를 통해 접근된다.
STL의 unordered_map과 비슷하지만, 언리얼의 리플렉션, 직렬화, GC, 네트워킹과 연동될 수 있다는 점이 특징이다.

### 특징

- `TMap`은 해시 기반 컨테이너라서 검색/삽입/삭제 속도가 빠르다.
- 키는 고유해야 하며, 값은 키를 통해서만 접근할 수 있다.
- `값 타입(value type)`으로 동작한다.
    - 복사/대입/소멸이 가능하고, 맵이 소멸되면 안의 요소들도 함께 소멸된다.
- 메모리 배치는 연속적이지 않으며, 삽입/삭제에 따라 내부 순서가 변할 수 있다.
- 내부적으로는 키 비교에 `GetTypeHash()`와 `operator==`를 사용한다.
- UObject*를 값으로 가질 경우 UPROPERTY()를 사용해야 GC가 추적할 수 있다.

### 사용법

#### **생성**

```cpp
	TMap<int32, FString> FruitMap;
```
- 정수 키(int32)와 문자열 값(FString)을 가지는 빈 맵 생성
- 기본적으로 힙 할당과 기본 키 비교(operator==), **해싱(GetTypeHash)**을 사용
- 선언 시점에는 메모리가 실제 할당되지 않음


#### **추가**

```cpp
    FruitMap.Add(5, TEXT("Banana"));
    FruitMap.Add(2, TEXT("Grapefruit"));
    FruitMap.Add(7, TEXT("Pineapple"));
    FruitMap.Emplace(3, TEXT("Orange"));
```

- 맵에 (키, 값) 쌍 삽입
- 같은 키를 추가하면 기존 값이 교체됨
- 값 없이 키만 전달하면, 값은 기본 생성자 값으로 채워짐

---

```cpp
    TMap<int32, FString> FruitMap2;
    FruitMap2.Emplace(4, TEXT("Kiwi"));
    FruitMap2.Emplace(9, TEXT("Melon"));
    FruitMap2.Emplace(5, TEXT("Mango"));

    FruitMap.Append(FruitMap2);
```
- `Append`: 다른 맵 병합
- FruitMap2의 원소를 FruitMap에 모두 추가.
- 동일 키가 있으면 기존 값 대체.

---

#### **에디터 노출**
```cpp
    UPROPERTY(EditAnywhere, Category="MapsAndSets")
    TMap<int32, FString> FruitMap;
```
- UPROPERTY와 함께 에디터 키워드(EditAnywhere, EditDefaultsOnly 등)를 붙이면, 언리얼 에디터에서 직접 추가/편집 가능

---

#### **반복 처리**

1. 범위 기반 for
```cpp
    for (auto& Elem : FruitMap)
    {
        FPlatformMisc::LocalPrint(
            *FString::Printf(
                TEXT("(%d, \"%s\")\n"),
                Elem.Key,
                *Elem.Value
            )
        );
    }
    // 출력 예시:
    // (5, "Mango")
    // (2, "Pear")
    // (7, "Pineapple")
    // (4, "Kiwi")
    // (3, "Orange")
    // (9, "Melon")
```

- TMap의 원소 타입은 TPair<Key, Value>, 따라서 auto& Elem으로 순회하면 Elem.Key, Elem.Value로 접근 가능

---

2. 이터레이터
```cpp
    for (auto It = FruitMap.CreateConstIterator(); It; ++It)
    {
        FPlatformMisc::LocalPrint(
            *FString::Printf(
                TEXT("(%d, \"%s\")\n"),
                It.Key(),    // == It->Key
                *It.Value()  // == *It->Value
            )
        );
    }
```
- `CreateIterator()` : 읽기/쓰기 가능
- `CreateConstIterator()` : 읽기 전용
- 이터레이터는 Key(), Value() 함수를 통해 요소 접근 가능

---

#### **쿼리**

1. 크기 확인
```cpp
    int32 Count = FruitMap.Num();
    // Count == 6
    // FruitKeys == [ 5,2,7,4,3,9,8 ]
    // FruitValues == [ "Mango","Pear","Pineapple","Kiwi","Orange", // "Melon","" ]
```

- `Num()` → 현재 맵에 들어있는 원소 개수 반환

---

2. 키 존재 여부 확인
```cpp
    bool bHas7 = FruitMap.Contains(7); // true
    bool bHas8 = FruitMap.Contains(8); // false
```
- `Contains(Key)` → 키가 있는지 여부 반환

---

3. 값 조회(operator[])
```cpp
    FString Val7 = FruitMap[7]; // "Pineapple"
    FString Val8 = FruitMap[8]; // 어서트 발생 (키 없음!)
```
- 키가 없으면 런타임 assert 발생 → 사용 전 반드시 Contains로 확인 필요

---

4. 안전한 값 조회(Find)
```cpp
    FString* Ptr7 = FruitMap.Find(7); // "Pineapple"
    FString* Ptr8 = FruitMap.Find(8); // nullptr
```
- 있으면 값의 포인터, 없으면 `nullptr` 반환

---

5. 안전 + 편의 함수
```cpp
    FString& Ref7 = FruitMap.FindOrAdd(7); // "Pineapple"
    FString& Ref8 = FruitMap.FindOrAdd(8); // "" (새 원소 추가됨)

    FString Val7 = FruitMap.FindRef(7); // "Pineapple"
    FString Val6 = FruitMap.FindRef(6); // "" (추가 X, 기본값 반환)
```

- `FindOrAdd` : 없으면 새 원소 추가 후 참조 반환 (non-const 전용)
- `FindRef` : 없으면 기본값을 반환 (새 원소 추가 X, const에서도 사용 가능)
    - 새 원소 추가로 인해 메모리 재할당이 발생하면, 기존에 얻은 포인터/레퍼런스가 무효화될 수 있음

---

6. 값 → 키 역조회
```cpp
    const int32* KeyMangoPtr   = FruitMap.FindKey(TEXT("Mango"));   // 5
    const int32* KeyKumquatPtr = FruitMap.FindKey(TEXT("Kumquat")); // nullptr
```

- 값으로부터 첫 번째 일치하는 키 포인터 반환
- 값 검색은 선형 탐색이라 비효율적

--- 

7. 키/값 배열 생성
```cpp
    TArray<int32>   FruitKeys;
    TArray<FString> FruitValues;

    FruitMap.GenerateKeyArray(FruitKeys);
    FruitMap.GenerateValueArray(FruitValues);
    // FruitKeys   == [5,2,7,4,3,9,8]
    // FruitValues == ["Mango","Pear","Pineapple","Kiwi","Orange","Melon",""]
```
- `GenerateKeyArray` : 모든 키를 TArray에 채움
- `GenerateValueArray` : 모든 값을 TArray에 채움
- 전달된 배열은 먼저 비워지고, 맵 원소 수와 동일한 크기로 채워짐
---

#### **제거**

1. 기본 제거(Remove)
```cpp
    FruitMap.Remove(8);
```
- 지정한 키와 일치하는 원소 제거
- 반환값: 제거된 원소 개수 (없으면 0)

--- 

2. 제거 + 값 반환(FindAndRemoveChecked)
```cpp
    FString Removed7 = FruitMap.FindAndRemoveChecked(7); // "Pineapple"
    FString Removed8 = FruitMap.FindAndRemoveChecked(8); // 어서트 발생
```
- 키가 있으면 해당 값을 반환 후 제거
- 키가 없으면 체크 실패 (assert 발생)

---

3. 제거 + 값 복사(RemoveAndCopyValue)
```cpp
    FString Removed;
    bool bFound2 = FruitMap.RemoveAndCopyValue(2, Removed);
    // bFound2 == true, Removed == "Pear"

    bool bFound8 = FruitMap.RemoveAndCopyValue(8, Removed);
    // bFound8 == false, Removed 변화 없음
```
- 성공 시 제거된 값이 출력 파라미터에 복사됨
- 실패 시 false 반환, 출력 값은 그대로 유지

---

4. 전체 제거 – Empty / Reset
```cpp
    FruitMap.Empty(); // 모든 원소 제거
    // Reset()도 동일하지만 슬랙 관리 방식이 다름
```

- `Empty()` : 전체 제거 + 남겨둘 슬랙 용량 지정 가능
- `Reset()` : 전체 제거 + 항상 최대한 슬랙 유지

---

#### **소팅**
- `TMap은` 기본적으로 순서가 없는 해시 컨테이너지만, 소팅을 수행하면 반복 시 정렬된 순서로 순회 가능하다.
- 단, 소팅 결과는 맵 수정 시 보장되지 않는다. (새 삽입/삭제 시 순서 깨짐).
- 소팅은 불안정 정렬(unstable sort) 이므로, 같은 키·값을 가진 경우 순서는 예측할 수 없다.

1. 키 기준 소팅 – KeySort
```cpp
    FruitMap.KeySort([](int32 A, int32 B) {
        return A > B; // 키 내림차순
    });

    // 결과 예시
    [
    { Key: 9, Value: "Melon"  },
    { Key: 5, Value: "Mango"  },
    { Key: 4, Value: "Kiwi"   },
    { Key: 3, Value: "Orange" }
    ]
```

2. 값 기준 소팅 – ValueSort
```cpp
    FruitMap.ValueSort([](const FString& A, const FString& B) {
        return A.Len() < B.Len(); // 문자열 길이 기준 오름차순
    });

    // 결과 예시
    [
    { Key: 4, Value: "Kiwi"   },
    { Key: 5, Value: "Mango"  },
    { Key: 9, Value: "Melon"  },
    { Key: 3, Value: "Orange" }
    ]
```

---
#### **연산자**

1. 복사 (Copy)

```cpp
    TMap<int32, FString> NewMap = FruitMap;
    NewMap[5] = "Apple";
    NewMap.Remove(3);

    // FruitMap
    [
    { Key: 4, Value: "Kiwi"   },
    { Key: 5, Value: "Mango"  },
    { Key: 9, Value: "Melon"  },
    { Key: 3, Value: "Orange" }
    ]

    // NewMap
    [
    { Key: 4, Value: "Kiwi"  },
    { Key: 5, Value: "Apple" },
    { Key: 9, Value: "Melon" }
    ]

```

- TMap은 정규 값 타입(value type) 이므로, 복사 생성자나 할당 연산자를 통해 복사 가능하다.
- 복사 시 깊은 복사(deep copy) 가 이루어져, 새 맵은 별도의 원소 사본을 가진다.

2. 이동 (Move)
```cpp
    FruitMap = MoveTemp(NewMap);

    // FruitMap
    [
    { Key: 4, Value: "Kiwi"  },
    { Key: 5, Value: "Apple" },
    { Key: 9, Value: "Melon" }
    ]

    // NewMap
    []

```
- TMap은 이동 시맨틱(move semantics) 을 지원한다.
- MoveTemp 사용 시, 소스 맵의 내부 데이터를 통째로 옮기고, 소스는 빈 상태가 된다.

---

#### **슬랙**
> 슬랙은 할당된 메모리 중 비어 있는 공간을 의미하며, 엘리먼트가 없더라도 메모리만 확보해 두거나 제거 후에도 메모리를 유지할 수 있다. 이를 적절히 활용하면 반복적인 삽입과 삭제 과정에서 발생하는 메모리 재할당 비용을 줄일 수 있다.
{: .prompt-tip }

1. 슬랙 확보 – Reserve
```cpp
    FruitMap.Reserve(10);
    for (int32 i = 0; i < 10; ++i)
    {
        FruitMap.Add(i, FString::Printf(TEXT("Fruit%d"), i));
    }
```

- 미리 10개 원소를 담을 수 있는 공간을 확보.
- 이후 Add 시, 추가 메모리 할당이 일어나지 않아 효율적.

2. 슬랙 해제 – Shrink / Compact
```cpp
    for (int32 i = 0; i < 10; i += 2)
    {
        FruitMap.Remove(i); // 홀수 키만 남김
    }

    // 중간에 빈 슬롯 다수 발생
    FruitMap.Shrink(); 
    // 끝의 빈 슬롯만 제거 → 일부는 여전히 남음

    FruitMap.Compact();
    // 빈 슬롯을 뒤로 몰아 정리

    FruitMap.Shrink();
    // 이제 모든 슬랙 제거됨
```

- `Shrink()` : 끝부분의 빈 공간만 해제.
- `Compact()` : 중간/앞부분의 빈 공간을 뒤로 몰아서 정리.
- `Compact()` 후 Shrink() 호출 시 모든 슬랙 제거 가능.

3. 전체 제거 – Empty vs Reset
```cpp
    FruitMap.Empty();      // 모든 원소 제거, 슬랙 크기 지정 가능
    FruitMap.Reset();      // 모든 원소 제거, 슬랙 최대한 유지
```
- `Empty` : 원하는 만큼 슬랙을 남기거나 아예 제거 가능
- `Reset` : 항상 슬랙을 남겨 재사용에 유리