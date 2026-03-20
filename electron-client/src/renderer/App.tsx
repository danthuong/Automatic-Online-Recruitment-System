import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useExamStore, Question } from '@/renderer/store/examStore'
import { ThemeProvider } from '@/renderer/contexts/ThemeContext'
import { LoginScreen } from '@/renderer/components/screens/LoginScreen'
import { PreCheckScreen } from '@/renderer/components/screens/PreCheckScreen'
import { ExamScreen } from '@/renderer/components/screens/ExamScreen'
import { ResultsScreen } from '@/renderer/components/screens/ResultsScreen'
import { ErrorBoundary } from '@/renderer/components/ErrorBoundary'
import { IntroScreen } from '@/renderer/components/screens/IntroScreen'

type Language = 'python' | 'javascript' | 'java' | 'cpp' | 'go' | 'rust'

const mockQuestions: Question[] = [
  {
    id: 'q1',
    title: 'Two Sum',
    difficulty: 'easy',
    type: 'code' as const,
    question: `Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].`,
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'nums[1] + nums[2] = 2 + 4 = 6',
      },
    ],
    testCases: [
      { input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', visible: true },
      { input: 'nums = [3,2,4], target = 6', expected: '[1,2]', visible: true },
      { input: 'nums = [3,3], target = 6', expected: '[0,1]', visible: false },
      { input: 'nums = [1,5,3,2], target = 4', expected: '[0,3]', visible: false },
    ],
    allowedLanguages: ['python', 'javascript', 'java', 'cpp', 'go', 'rust'] as Language[],
    starterCode: {
      python: `def two_sum(nums, target):
    # Your codehere
    pass`,
      javascript: `function twoSum(nums, target) {
    // Your code here
    
}`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
}`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
        return {};
    }
};`,
      go: `func twoSum(nums []int, target int) []int {
    // Your code here
    return []int{}
}`,
      rust: `impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        // Your code here
        vec![]
    }
}`,
    } as Record<Language, string>,
  },
  {
    id: 'q2',
    title: 'Longest Increasing Subsequence',
    difficulty: 'medium',
    type: 'code' as const,
    question: `Given an integer array nums, return the length of the longest strictly increasing subsequence.

A subsequence is a sequence that can be derived from an array by deleting some or no elements without changing the order of the remaining elements.

Example:
Input: nums = [10,9,2,5,3,7,101,18]
Output: 4
Explanation: The longest increasing subsequence is [2,3,7,101], therefore the length is 4.`,
    constraints: [
      '1 <= nums.length <= 2500',
      '-10^4 <= nums[i] <= 10^4',
    ],
    examples: [
      {
        input: 'nums = [10,9,2,5,3,7,101,18]',
        output: '4',
        explanation: '[2,3,7,101] is the longest increasing subsequence',
      },
      {
        input: 'nums = [0,1,0,3,2,3]',
        output: '4',
        explanation: '[0,1,2,3] is the longest increasing subsequence',
      },
    ],
    testCases: [
      { input: 'nums = [10,9,2,5,3,7,101,18]', expected: '4', visible: true },
      { input: 'nums = [0,1,0,3,2,3]', expected: '4', visible: true },
      { input: 'nums = [7,7,7,7,7,7,7]', expected: '1', visible: false },
      { input: 'nums = [1,2,3,4,5]', expected: '5', visible: false },
    ],
    allowedLanguages: ['python', 'javascript', 'java', 'cpp', 'go', 'rust'] as Language[],
    starterCode: {
      python: `def length_of_lis(nums):
    # Your code here
    pass`,
      javascript: `function lengthOfLIS(nums) {
    // Your code here
    
}`,
      java: `class Solution {
    public int lengthOfLIS(int[] nums) {
        // Your code here
        return 0;
    }
}`,
      cpp: `class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        // Your code here
        return 0;
    }
};`,
      go: `func lengthOfLIS(nums []int) int {
    // Your code here
    return 0
}`,
      rust: `impl Solution {
    pub fn length_of_lis(nums: Vec<i32>) -> i32 {
        // Your code here
        0
    }
}`,
    } as Record<Language, string>,
  },
  {
    id: 'q3',
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'medium',
    type: 'code' as const,
    question: `Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).

You may return the result in any order.

Example:
Input: root = [3,9,20,null,null,15,7]
Output: [[3],[9,20],[15,7]]
Explanation: The tree has 3 levels.`,
    constraints: [
      'The number of nodes in the tree is in the range [0, 2000]',
      '-1000 <= Node.val <= 1000',
    ],
    examples: [
      {
        input: 'root = [3,9,20,null,null,15,7]',
        output: '[[3],[9,20],[15,7]]',
        explanation: '3 at level 0, 9 and 20 at level 1, 15 and 7 at level 2',
      },
      {
        input: 'root = [1]',
        output: '[[1]]',
        explanation: 'Single node tree',
      },
    ],
    testCases: [
      { input: 'root = [3,9,20,null,null,15,7]', expected: '[[3],[9,20],[15,7]]', visible: true },
      { input: 'root = [1]', expected: '[[1]]', visible: true },
      { input: 'root = []', expected: '[]', visible: false },
      { input: 'root = [1,2,3,4,5,null,6,7]', expected: '[[1],[2,3],[4,5,6],[7]]', visible: false },
    ],
    allowedLanguages: ['python', 'javascript', 'java', 'cpp', 'go', 'rust'] as Language[],
    starterCode: {
      python: `from typing import Optional, List

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def level_order(root: Optional[TreeNode]) -> List[List[int]]:
    # Your code here
    pass`,
      javascript: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function levelOrder(root) {
  // Your code here
  
}`,
      java: `class Solution {
    public class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;
        TreeNode(int x) { val = x; }
    }
    
    public List<List<Integer>> levelOrder(TreeNode root) {
        // Your code here
        return new ArrayList<>();
    }
}`,
      cpp: `class Solution {
public:
    struct TreeNode {
        int val;
        TreeNode *left;
        TreeNode *right;
        TreeNode(int x) : val(x), left(NULL), right(NULL) {}
    };
    
    vector<vector<int>> levelOrder(TreeNode* root) {
        // Your code here
        return {};
    }
};`,
      go: `type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func levelOrder(root *TreeNode) [][]int {
    // Your code here
    return [][]int{}
}`,
      rust: `#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Rc<RefCell<TreeNode>>>,
    pub right: Option<Rc<RefCell<TreeNode>>>,
}

impl Solution {
    pub fn level_order(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<Vec<i32>> {
        // Your code here
        vec![]
    }
}`,
    } as Record<Language, string>,
  },
]

const totalTime = 60 * 60

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn' as const,
    },
  },
}

function App() {
  const { status, setQuestions, questions } = useExamStore()
  const [showIntro, setShowIntro] = useState(true)
  const [introCompleted, setIntroCompleted] = useState(false)

  useEffect(() => {
    console.log('[App] Initializing questions:', mockQuestions.length)
    setQuestions(mockQuestions, totalTime)
  }, [])

  useEffect(() => {
    console.log('[App] Status changed to:', status, '| Questions:', questions.length)
  }, [status, questions.length])

  const renderScreen = () => {
    // Show login first time, then show based on status
    if (status === 'idle' || status === 'login') {
      return <LoginScreen />
    }

    switch (status) {
      case 'precheck':
        return <PreCheckScreen />
      case 'exam':
      case 'disqualified':
        if (questions.length === 0) {
          console.error('[App] Questions not loaded!')
          return (
            <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-destructive">Error: Questions not loaded</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded">
                  Reload
                </button>
              </div>
            </div>
          )
        }
        return (
          <ErrorBoundary>
            <ExamScreen />
          </ErrorBoundary>
        )
      case 'submitted':
        return <ResultsScreen />
      default:
        return <LoginScreen />
    }
  }

  return (
    <ThemeProvider>
      {/* Intro Screen */}
      {showIntro && !introCompleted && (
        <IntroScreen 
          onComplete={() => {
            setIntroCompleted(true)
            setShowIntro(false)
          }} 
        />
      )}
      
      {/* Main Application */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          className="min-h-screen"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
    </ThemeProvider>
  )
}

export default App
