---
title: 알고리즘 문제 해결 전략 - BOARDCOVER
date: 2024-11-19 01:40:00 +09:00
categories: [Algorithm, 문제해결전략]
tags:
  [algorithm, 알고리즘 문제 해결 전략, coding test]
---
[BOARDCOVER](https://algospot.com/judge/problem/read/BOARDCOVER)

## Code

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int C, H, W, ans;

int diff[4][2] = {
	                 {0,1}, //    t, 0
    {1,-1},  {1,0},  {1,1}  // 1, 2, 3
};

pair<int,int> Combi[4] = { {0,2}, {0,3}, {1,2}, {2,3} };

void Solution(vector<vector<bool>>& board)
{
    // 게임판을 다 덮었는지 확인
    bool flag = true;
    vector<int> target = { -1,-1 };
    for (int i = 0; i < board.size(); ++i)
    {
        if (flag == false)
            break;

        for (int j = 0; j < board[i].size(); ++j)
        {
            if (board[i][j] == false)
            {
                flag = false;
                target[0] = i;
                target[1] = j;
                break;
            }
        }
    }

    if (flag == true)
    {
        ++ans;
        return;
    }

    for (int i = 0; i < 4; ++i)
    {
        int Subset1 = Combi[i].first;
        int Subset2 = Combi[i].second;

        int Subset1NextY = target[0] + diff[Subset1][0];
        int Subset1NextX = target[1] + diff[Subset1][1];

        int Subset2NextY = target[0] + diff[Subset2][0];
        int Subset2NextX = target[1] + diff[Subset2][1];

        // Subset1의 범위가 board를 넘어갔을 경우
        if (Subset1NextY < 0 || Subset1NextY >= H || Subset1NextX < 0 || Subset1NextX >= W)
            continue;

        // Subset2의 범위가 board를 넘어갔을 경우
        if (Subset2NextY < 0 || Subset2NextY >= H || Subset2NextX < 0 || Subset2NextX >= W)
            continue;

        if (board[Subset1NextY][Subset1NextX] == false && board[Subset2NextY][Subset2NextX] == false)
        {
            board[Subset1NextY][Subset1NextX] = true;
            board[Subset2NextY][Subset2NextX] = true;
            board[target[0]][target[1]] = true;

            Solution(board);

            board[Subset1NextY][Subset1NextX] = false;
            board[Subset2NextY][Subset2NextX] = false;
            board[target[0]][target[1]] = false;
        }
    }
}

int main()
{
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    cout.tie(NULL);

    cin >> C;

    while (C--)
    {
        cin >> H >> W;

        vector<vector<bool>> board(H, vector<bool>(W, false));
        ans = 0;
        int count = 0;

        for (int i = 0; i < H; ++i)
        {
            for (int j = 0; j < W; ++j)
            {
                char tmp;
                cin >> tmp;

                if (tmp == '#')
                {
                    board[i][j] = true;
                }
                else
                {
                    ++count;
                }
            }
        }
        if (count % 3 == 0)
        {
            Solution(board);
        }

        cout << ans << endl;
    }

    return 0;
}
```

## 틀린 이유
게임판을 덮을 수 있는 모든 경우를 계산하기 위해 재귀 함수를 사용해 구현했다. 먼저 빈 칸을 찾아 타일을 배치할 수 있는지 확인한 뒤, 해당 칸을 채우고 다음 재귀 호출에서 또 다른 빈 칸을 찾아 같은 과정을 반복하는 방식이었다. 그러나 이 방법에는 중복된 경우를 세는 문제가 있었다.

예를 들어, ㄱ 모양의 타일을 (0, 0)에 놓을 수 있었다고 가정해 보자. 이 경우, (0, 0)에 ㄱ 모양의 타일을 배치한 뒤 재귀 함수에서 모든 가능한 경우를 탐색한다. 하지만 이후 (1, 1)에 ㄴ 모양의 타일을 배치하고 나서 다시 (0, 0)에 ㄱ 모양의 타일을 놓는 경우도 계산에 포함되는 문제가 발생했다. 이미 (0, 0)에 ㄱ 모양의 타일을 배치한 상태에서 모든 탐색을 마쳤음에도, 배치 순서가 달라졌다는 이유로 같은 경우를 중복해서 카운팅한 실수였다.

이런 중복을 피하기 위해 타일을 놓는 순서를 강제했다. 재귀 함수에서는 항상 인덱스가 가장 적은순으로 타일을 채우기로 한다. 이렇게 될 경우 타일을 놓는 순서가 고정되기 때문에 놓는 순서에 의한 중복을 제거할 수 있다.

## 풀이
1. 입력을 받으면서 빈칸의 개수를 세고, 정답이 아닌경우에 대해 예외처리를 한다.
2. 재귀 함수안에서 배열의 빈칸 중 인덱스가 가장 작은 곳을 찾고 해당 위치에 놓을수 있는 타일 모양을 모두 탐색한다.
3. 가능한 타일 모양대로 타일을 놓고 다음 재귀함수로 들어가 2~3의 과정을 반복한다.