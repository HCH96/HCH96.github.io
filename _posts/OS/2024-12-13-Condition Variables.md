---
title: Condition Variables
date: 2024-12-13 20:00:00 +09:00
categories: [OS, Concurrency]
math: true
tags:
  [operating system, ostep, concurrency, condition variable]
---

병행 프로그램을 구현하다 보면 쓰레드가 계속 진행하기 전에 어떤 조건이 참인지를 검사해야 하는 경우가 있다. 예를 들어 부모 쓰레드가 작업을 시작하기 전에 자식 쓰레드가 작업을 끝냈는지를 검사하기를 원할 수 있다. 

```c
volatile int done = 0;

void *child(void *arg) {
    printf(“child\n ”);
    done = 1;
    return NULL;
}

int main(int argc , char *argv[]) {
    printf(“parent: begin\n ”);
    pthread_t c;
    Pthread_create(&c , NULL , child , NULL); // 자식 생성하기
    while (done == 0)
    ; // 회전전
    printf(“parent: end\n ”);
    return 0;
}
```

## **Condition Variable(컨디션 변수)**
컨디션 변수는 여러 쓰레드가 특정 조건이 충족될 때까지 기다릴 수 있도록 설계된 동기화 도구이다. 이는 큐 자료 구조와 비슷한 역할을 하며, 다른 쓰레드가 조건을 만족시키면 대기 중인 쓰레드를 깨워 진행할 수 있도록 한다.

### **컨디션 변수의 주요 연산**

```
pthread_cond_wait(pthread_cond_t *c , pthread_mutex_t *m);
pthread_cond_signal(pthread_cond_t *c);
```

- **`wait()`**: 쓰레드가 조건을 기다리며 스스로를 대기 상태로 전환한다. 이때, 락(mutex)을 해제한다.
- **`signal()`**: 조건이 만족되었을 때, 대기 중인 쓰레드를 깨운다.

### **wait()의 동작 원리와 주의점**
wait()는 반드시 락(mutex)이 잠겨 있는 상태에서 호출되어야 한다. wait()가 호출된 쓰레드는 자신을 Condition Variable에 등록한 뒤 Sleep 상태로 들어간다. 이후, 조건이 만족되면 다른 쓰레드가 신호를 보내 Condition Variable에 등록된 대기 중인 쓰레드를 깨운다.

이 과정에서 **경쟁 조건(race condition)**을 방지하기 위해 공유 자원인 Condition Variable에 접근하려면 반드시 락을 획득해야 한다. 그러나 Sleep 상태로 들어간 쓰레드가 락을 계속 소유하고 있다면, 다른 쓰레드가 락을 획득하지 못해 Condition Variable에 등록된 쓰레드를 깨울 수 없게 된다. 이를 방지하기 위해 wait()는 호출 시 락을 해제한 후 Sleep 상태로 들어가고, 깨어난 후 다시 락을 재획득하여 작업을 이어갈 수 있도록 설계되어 있다.


### **예제**

```c
int done = 0;
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t c = PTHREAD_COND_INITIALIZER;

void thr_exit() {
    Pthread_mutex_lock(&m);
    done = 1;
    Pthread_cond_signal(&c);
    Pthread_mutex_unlock(&m);
}

void *child(void *arg) {
    printf("child\n");
    thr_exit();
    return NULL;
}

void thr_join() {
    Pthread_mutex_lock(&m);
    while (done == 0)
        Pthread_cond_wait(&c , &m);
    Pthread_mutex_unlock(&m);
}

int main(int argc , char *argv[]) {
    printf("parent: begin\n");
    pthread_t p;
    Pthread_create(&p, NULL, child, NULL);
    thr_join();
    printf("parent: end\n");
    return 0;
}
```

#### 실행 흐름
1. 부모 쓰레드가 자식 쓰레드를 생성하는 경우

    - 부모 쓰레드는 thr_join()을 호출해 자식 쓰레드가 종료되기를 기다린다.
    - done 변수를 확인한 후, 조건이 만족되지 않으면 wait()를 호출해 대기 상태에 들어간다.
    - 자식 쓰레드는 thr_exit()에서 signal()을 호출해 부모 쓰레드를 깨운다.
    - 부모 쓰레드는 락을 재획득한 후 thr_join()을 종료하고, 프로그램은 정상적으로 끝난다.

2. 자식 쓰레드가 즉시 실행되어 종료되는 경우

    - 자식 쓰레드가 먼저 실행되어 done 변수를 1로 설정하고 signal()을 보낸다.
    - 부모 쓰레드는 done 변수를 확인하고 조건이 이미 만족되었으므로 대기 없이 바로 리턴한다.

### **if 대신 while을 사용하는 이유**
while문을 사용하는 이유는 경쟁 조건을 방지하기 위함이다. 쓰레드가 깨어났더라도 조건이 여전히 만족되지 않을 가능성을 염두에 두어야 한다. 즉, 조건 확인이 반복적으로 이루어져야 정확한 동작을 보장할 수 있다.

### **상태변수가 필요한 이유**

```c
void thr_exit() {
    Pthread_mutex_lock(&m);
    Pthread_cond_signal(&c);
    Pthread_mutex_unlock(&m);
}

void thr_join() {
    Pthread_mutex_lock(&m);
    Pthread_cond_wait(&c , &m);
    Pthread_mutex_unlock(&m);
}
```

위 코드에서는 done 상태 변수가 없기 때문에 다음과 같은 문제가 발생할 수 있다.

1. 자식 쓰레드가 생성된 이후 먼저 실행되어 `thr_exit()` 함수가 호출된다.
2. signal()을 호출하지만, 부모 쓰레드가 아직 wait() 상태에 들어가지 않았다면 부모 쓰레드는 깨어나지 못한다.
3. 자식 쓰레드의 모든 함수가 종료되고 부모 쓰레드가 실행된다. `thr_join()` 함수를 호출한다.
4. 부모 쓰레드는 `wait()`를 호출하고 sleep 상태가 된다.
2. 결국 부모 쓰레드는 영원히 대기 상태에 머물게 된다.


---
### **락(mutex)을 사용해야 하는 이유**

```c
void thr_exit() {
    done = 1;
    Pthread_cond_signal(&c);
}

void thr_join() {
    if (done == 0)
        Pthread_cond_wait(&c);
}
```

위 코드에서는 락을 사용하지 않기 때문에 다음과 같은 경쟁 조건이 발생할 수 있다.

1. 부모 쓰레드가 done 변수 확인 후 wait()를 호출하려는 순간, 자식 쓰레드가 실행되어 done을 변경하고 signal()을 호출한다.
2. 부모 쓰레드는 조건이 만족되었음에도 대기 상태로 들어가며, 이를 깨울 쓰레드가 없게 된다.

---

## **생산자/소비자(유한 버퍼) 문제**

### **문제 개요**
생산자/소비자 문제는 Edsger Dijkstra가 제시한 동기화 문제로, 유한 버퍼 문제(bounded buffer problem)라고도 한다. 여러 개의 **생산자 쓰레드**가 데이터를 생성하여 버퍼에 넣고, **소비자 쓰레드**가 이 데이터를 버퍼에서 꺼내 사용하는 구조이다. 

이 문제는 멀티 쓰레드 환경에서 자주 발생하며, 시스템 동작의 중요한 패턴으로 자리 잡고 있다. 예를 들어:
- 멀티 쓰레드 웹 서버: 생산자는 HTTP 요청을 큐에 추가, 소비자는 이를 처리
- Unix 파이프: 한 프로그램의 결과를 다른 프로그램에 전달


#### **버퍼의 기본 구조**
버퍼는 단순히 하나의 값을 저장하는 구조로 시작한다. 아래 코드는 값을 버퍼에 저장(`put`)하고 꺼내는(`get`) 간단한 루틴이다.

```c
int buffer;
int count = 0; // 버퍼 상태를 나타냄

void put(int value) {
    assert(count == 0); // 버퍼가 비어 있는지 확인
    count = 1;          // 버퍼를 가득 찼다고 표시
    buffer = value;      // 값을 버퍼에 저장
}

int get() {
    assert(count == 1);  // 버퍼가 가득 찬지 확인
    count = 0;           // 버퍼를 비었다고 표시
    return buffer;       // 버퍼 값을 반환
}

void *producer(void *arg) {
    int i;
    int loops = (int)arg; // 생산 횟수
    for (i = 0; i < loops; i++) {
        put(i); // 버퍼에 데이터 저장
    }
}

void *consumer(void *arg) {
    int tmp;
    while (1) {
        tmp = get(); // 버퍼에서 데이터 가져옴
        printf("%d\n", tmp); // 데이터를 출력
    }
}
```

- put(): 버퍼가 비어 있을 때만 데이터를 저장한다.
- get(): 버퍼가 찼을 때만 데이터를 꺼낸다.
- count: 버퍼 상태를 나타내며, 0(비어 있음) 또는 1(가득 참)만 가질 수 있다.
- 생산자 쓰레드는 데이터를 생성하여 버퍼에 저장하는 역할을 한다. 위의 코드는 일정 횟수만큼 데이터를 생산하는 예제이다.
- 소비자 쓰레드는 버퍼에서 데이터를 꺼내 사용하는 역할을 한다. 위의 코드는 무한 루프를 돌며 데이터를 소비하는 예제이다.


#### **문제점**
유한 버퍼라는 공유자원에 대해 동기화되지 않은 두 쓰레드가 접근하기 떄문에 데이터 손실이나 잘못된 동작이 발생한다.
    - 생산자가 버퍼에 값을 넣지 않았는데 소비자가 중복해서 값을 꺼내가거나, 비어있는 버퍼에 접근할 수 있다.
    - 생산자는 소비자가 아직 버퍼를 처리하지 않았는데 다시 버퍼에 값을 넣어 데이터가 손실될 수 있다.


---

### **Condition Variable의 사용**

```c
cond_t cond;
mutex_t mutex;

void *producer(void *arg) {
    int i;
    for (i = 0; i < loops; i++) {
        Pthread_mutex_lock(&mutex);             // p1
        if (count == 1)                         // p2
            Pthread_cond_wait(&cond, &mutex);   // p3
        put(i);                                 // p4
        Pthread_cond_signal(&cond);             // p5
        Pthread_mutex_unlock(&mutex);           // p6
    }
}

void *consumer(void *arg) {
    int i;
    for (i = 0; i < loops; i++) {
        Pthread_mutex_lock(&mutex);             // c1
        if (count == 0)                         // c2
            Pthread_cond_wait(&cond, &mutex);   // c3
        int tmp = get();                        // c4
        Pthread_cond_signal(&cond);             // c5
        Pthread_mutex_unlock(&mutex);           // c6
        printf("%d\n", tmp);
    }
}
```
위의 코드는 컨디션 변수와 락을 사용하여 보완된 코드이다. 소비자와 생산자는 공유 자원에 접근하기 전에 Lock을 획득하고 공유 자원의 상태를 판단하여 `wait()`상태에 들어간다.


#### **문제점**
만약 두 개 이상의 같은 종류의 쓰레드가 존재한다면 문제가 생길수 있다.

![alt text](/assets/img/OS/컨디션%20변수/image.png)
_쓰레드 흐름_

다음은 생산자와 소비자 간 동기화 문제에서 발생할 수 있는 경쟁 조건을 다룬다.  
여기서 **두 개의 소비자(Tc1, Tc2)**와 **하나의 생산자(Tp)**가 있다고 가정한다.

##### **상황 전개**
1. **소비자(Tc1)가 먼저 실행**  
   - 소비자 Tc1이 락을 획득(c1)하고, 버퍼가 비어 있는지 확인(c2).  
   - 버퍼가 비어 있음을 확인한 후 대기 상태(c3)로 전환하며 락을 해제.

2. **생산자(Tp)가 실행**  
   - Tp가 락을 획득(p1)하고, 버퍼 상태를 확인(p2).  
   - 버퍼가 비어 있음을 확인 후 데이터를 버퍼에 저장(p4).  
   - Tp는 시그널을 보내 대기 중이던 Tc1을 깨움(p5).  
   - 이후 생산자 Tp는 대기 상태로 전환.

3. **문제 발생: 두 번째 소비자(Tc2)가 실행**  
   - 대기 중이던 Tc1이 준비 큐에 들어가 실행될 준비를 마쳤지만 아직 실행 상태가 아님.  
   - 대신 Tc2가 먼저 실행되면서 락을 획득(c1)하고, 버퍼 상태를 확인(c2).  
   - Tc2가 버퍼에 있는 데이터를 소비(c4)하고, 락을 해제(c6).  

4. **Tc1이 실행**  
   - Tc1이 대기 상태에서 깨어나 락을 획득한 후 실행.  
   - `get()`을 호출(c4)하지만, 이미 Tc2가 버퍼를 소비했으므로 버퍼는 비어 있는 상태.  
   - 결과적으로 Tc1은 비어 있는 버퍼에서 데이터를 꺼내는 오류 발생. 

##### **문제의 원인**
- 시그널은 쓰레드를 깨우기만 하며, 버퍼 상태가 그대로 유지된다는 보장은 없다.  
- 대기 중인 Tc1이 깨어나 실행되기 전에 Tc2가 버퍼의 상태를 변경하여 경쟁 조건이 발생했다.  
- 이 문제는 **시그널이 단순히 힌트를 제공**한다는 점에서 비롯된다. 버퍼에 값이 추가되었다는 사실을 알리지만, Tc1이 실행될 때 상태가 동일할 것이라는 보장은 없다.


> Mesa semantic은 컨디션 변수를 구현하는 방식 중 하나로, 쓰레드가 시그널을 받아 깨어나도 즉시 실행되지 않고 준비 상태로 전환되는 특징을 가진다. 반면, Hoare semantic은 시그널을 받은 쓰레드가 즉시 실행되는 것을 보장하며, 더 엄격한 동기화 모델을 제공하지만 구현이 복잡하다. 대부분의 현대 시스템은 구현의 단순성과 성능상의 이점을 고려하여 Mesa semantic을 채택하고 있다.
{: .prompt-tip }

---

### **`if`대신 `while`을 사용**

```c
cond_t cond;
mutex_t mutex;

void *producer(void *arg) {
    int i;
    for (i = 0; i < loops; i++) {
        Pthread_mutex_lock(&mutex);                 // p1
        while (count == 1)                          // p2
            Pthread_cond_wait(&cond, &mutex);       // p3
        put(i);                                     // p4
        Pthread_cond_signal(&cond);                 // p5
        Pthread_mutex_unlock(&mutex);               // p6
    }
}

void *consumer(void *arg) {
    int i;
    for (i = 0; i < loops; i++) {
        Pthread_mutex_lock(&mutex);                 // c1
        while (count == 0)                          // c2
            Pthread_cond_wait(&cond, &mutex);       // c3
        int tmp = get();                            // c4
        Pthread_cond_signal(&cond);                 // c5
        Pthread_mutex_unlock(&mutex);               // c6
        printf("%d\n", tmp);
    }
}
```

이전 코드에서는 시그널이 쓰레드를 깨운 후 버퍼 상태가 변경되었는지 확인할 수 없어 문제가 발생했다. 이를 해결하기 위해, 수정된 코드에서는 쓰레드가 깨어난 후 상태를 다시 확인하고, 조건이 만족되지 않으면 다시 대기 상태로 전환된다. 이렇게 상태를 반복적으로 확인하는 방식을 통해 문제를 방지할 수 있다.


#### **문제점**

![alt text](/assets/img/OS/컨디션%20변수/image-1.png)
_쓰레드 흐름_

1. **초기 상태**  
   - 소비자 쓰레드 Tc1과 Tc2는 모두 대기 상태에 있다(c3).  
   - 생산자 쓰레드 Tp가 실행되어 버퍼에 값을 넣고, 대기 중인 쓰레드 중 하나(Tc1)를 깨운다(p5).  
   - Tp는 이후 대기 상태로 전환된다.

2. **Tc1의 실행**  
   - Tc1이 `wait()`에서 깨어난 후(c3) 조건을 재확인(c2)한다.  
   - 버퍼가 차 있음을 확인하고 데이터를 소비(c4)한다.  
   - Tc1은 데이터를 소비한 후 시그널을 보내(c5) 대기 중인 다른 쓰레드를 깨운다.

3. **문제 발생**  
   - 이 시그널로 Tc2(소비자)가 깨어날 수 있다.  
   - Tc2가 실행되면 버퍼가 비어 있음을 확인(c2)하고 다시 대기 상태로 들어간다(c3).  
   - 생산자 Tp는 여전히 대기 상태에 있으며, 버퍼에 값을 넣을 수 있는 쓰레드가 없다.  
   - 결과적으로 Tc1, Tc2, Tp 모두 대기 상태에 빠져 교착 상태(deadlock)가 발생한다.

#### **문제 원인**
- 시그널이 잘못된 쓰레드(Tc2)를 깨우면서 발생한 문제이다.  
- 소비자가 데이터를 소비한 후에는 **생산자(Tp)를 깨워야** 하지만, 대기 큐 관리 방식에 따라 **다른 소비자(Tc2)가 깨어나는 경우**가 발생한다.  
- 버퍼 상태와 관계없는 쓰레드가 깨어나면서 작업이 제대로 진행되지 않는다.

---
### **시그널을 보내는 대상이 명확히 하자**
위 문제는 시그널이 잘못된 쓰레드를 깨우면서 발생한 문제이다. 이를 해결하기 위해, 두 개의 컨디션 변수를 사용하여 소비자 쓰레드와 생산자 쓰레드가 각기 다른 컨디션 변수에서 대기하도록 수정한다. 이를 통해 시그널을 보낼 대상 쓰레드를 명확히 구분하여 문제를 해결할 수 있다.

```c
cond_t empty, fill;
mutex_t mutex;

void *producer(void *arg) {
    int i;
    for (i = 0; i < loops; i++) {
        Pthread_mutex_lock(&mutex);
        while (count == 1)
            Pthread_cond_wait(&empty, &mutex);
        put(i);
        Pthread_cond_signal(&fill);
        Pthread_mutex_unlock(&mutex);
    }
}

void *consumer(void *arg) {
    int i;
    for (i = 0; i < loops; i++) {
        Pthread_mutex_lock(&mutex);
        while (count == 0)
            Pthread_cond_wait(&fill, &mutex);
        int tmp = get();
        Pthread_cond_signal(&empty);
        Pthread_mutex_unlock(&mutex);
        printf("%d\n", tmp);
    }
}
```

생산자 쓰레드는 empty 조건 변수에서 대기하며, fill 조건 변수에 대해 시그널을 발생시킨다. 반대로, 소비자 쓰레드는 fill 조건 변수에서 대기하며, empty 조건 변수에 대해 시그널을 발생시킨다. 이를 통해 소비자가 실수로 다른 소비자를 깨우거나, 생산자가 다른 생산자를 깨우는 문제가 발생하지 않도록 한다.

---

### **병행성 확장**
현재까지의 해결법은 올바르게 동작하지만, 보편적으로 효율적인 방법은 아니다. 이를 개선하기 위해 다음과 같은 변경을 통해 병행성을 증가시키고 더 효율적으로 만든다.

```c
int buffer[MAX];
int fill = 0;
int use = 0;
int count = 0;

void put(int value) {
    buffer[fill] = value;
    fill = (fill + 1) % MAX; // 다음 위치로 이동, 순환
    count++;                 // 버퍼에 있는 값의 개수 증가
}

int get() {
    int tmp = buffer[use];
    use = (use + 1) % MAX; // 다음 위치로 이동, 순환
    count--;               // 버퍼에 있는 값의 개수 감소
    return tmp;            // 꺼낸 값 반환
}
```

```c
cond_t empty, fill;
mutex_t mutex;

void *producer(void *arg) {
    int i;
    for (i = 0; i < loops; i++) {
        Pthread_mutex_lock(&mutex);                 // p1
        while (count == MAX)                        // p2
            Pthread_cond_wait(&empty, &mutex);      // p3
        put(i);                                     // p4
        Pthread_cond_signal(&fill);                 // p5
        Pthread_mutex_unlock(&mutex);               // p6
    }
}

void *consumer(void *arg) {
    int i;
    for (i = 0; i < loops; i++) {
        Pthread_mutex_lock(&mutex);                 // c1
        while (count == 0)                          // c2
            Pthread_cond_wait(&fill, &mutex);       // c3
        int tmp = get();                            // c4
        Pthread_cond_signal(&empty);                // c5
        Pthread_mutex_unlock(&mutex);               // c6
        printf("%d\n", tmp);
    }
}
```

#### **개선 사항**
기존에는 단일 값만 저장 가능한 버퍼를 사용했으나, 이를 여러 값을 저장할 수 있도록 확장한다. 이를 통해 생산자는 대기 상태에 들어가기 전 여러 값을 생산할 수 있고, 소비자 역시 여러 값을 소비할 수 있다.

#### **효과**
버퍼 공간이 확장됨으로 인해 단일 생산자-소비자의 경우 쓰레드 간의 문맥 교환이 줄어들어 효율성이 향상되고, 멀티 생산자-소비자 환경에서는 생산과 소비가 병렬로 이루어질 수 있어 병행성이 더 좋아진다.


---

## **컨디션 변수 사용 시 주의점**
컨디션 변수의 사용 예로 Lampson과 Redell이 제안한 멀티쓰레드 기반 메모리 할당 라이브러리를 살펴본다. 이는 Mesa semantic을 처음 구현한 연구에서 제시된 예제이다.

```c
int bytesLeft = MAX_HEAP_SIZE; // 남은 힙 메모리 크기

cond_t c;                      // 컨디션 변수
mutex_t m;                     // 뮤텍스

void *allocate(int size) {
    Pthread_mutex_lock(&m);
    while (bytesLeft < size) {
        Pthread_cond_wait(&c, &m); // 메모리가 충분하지 않을 경우 대기
    }
    void *ptr = ...;              // 메모리 할당 로직
    bytesLeft -= size;            // 사용한 메모리 크기만큼 감소
    Pthread_mutex_unlock(&m);
    return ptr;
}

void free(void *ptr, int size) {
    Pthread_mutex_lock(&m);
    bytesLeft += size;            // 메모리 반환, 사용 가능 크기 증가
    Pthread_cond_signal(&c);      // 대기 중인 쓰레드를 깨움
    Pthread_mutex_unlock(&m);
}
```

### **설명**
- 메모리 할당 코드를 호출한 쓰레드는, 할당 가능한 메모리가 없을 경우 대기 상태로 전환된다.
- 메모리를 반납한 쓰레드는 사용 가능한 메모리가 늘어났음을 다른 쓰레드에 알리기 위해 시그널을 보낸다.

### **문제 상황**
1. 쓰레드 Ta가 allocate(100)을 호출하지만, 빈 공간이 없어 대기 상태에 들어간다.
2. 쓰레드 Tb가 allocate(10)을 호출하지만, 역시 빈 공간이 없어 대기 상태에 들어간다.
3. 쓰레드 Tc가 free(50)을 호출해 메모리를 반납한다.
4. 쓰레드 Ta가 깨어나면, Ta의 요청을 처리할 메모리가 충분하지 않아 다시 대기 상태에 들어가게 된다.

위의 문제는 어떤 쓰레드를 깨워야 할지 결정할 수 없다는 점에서 발생한다.

### **해결**
pthread_cond_signal() 대신 pthread_cond_broadcast()를 사용하여 대기 중인 모든 쓰레드를 깨운다. 깨어난 쓰레드들은 조건을 재검사하며, 조건을 만족하지 못한 쓰레드는 다시 대기 상태로 전환된다. 이런 방식을 **커버링 조건(Covering Condition)**이라고 한다.

- 장점: 모든 대기 중인 쓰레드를 깨우기 때문에, 조건을 만족하는 쓰레드가 빠르게 실행될 수 있다.
- 단점: 조건을 만족하지 못하는 쓰레드도 깨어나기 때문에 불필요한 문맥 전환이 발생한다. 이는 성능에 부정적인 영향을 미칠 수 있다.