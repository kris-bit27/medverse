import React, { useState } from 'react';
import { callApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, AlertCircle, CheckCircle2 } from 'lucide-react';
import { canUseFeature, UPSELL_MESSAGES } from '@/components/utils/featureAccess';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function QuizFlashcardsTab({ question, user, topic }) {
  const [quizData, setQuizData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const featureCheck = canUseFeature(user, 'quiz_generator');

  const generateQuiz = async () => {
    setIsLoading(true);
    try {
      const res = await callApi('invokeEduLLM', {
        mode: 'question_quiz',
        entityContext: {
          entityType: 'question',
          entityId: question.id,
          question,
          topic
        },
        userPrompt: `Vytvoř 5 MCQ otázek k tématu: ${question.title}`,
        allowWeb: false
      });

      setQuizData(res);
    } catch (e) {
      console.error('Quiz generation error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (questionIndex, answer) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  // Pokud existuje answer_quiz_json, použij to
  const quizQuestions = question.answer_quiz_json?.questions || quizData?.structuredData?.questions;

  if (!featureCheck.allowed) {
    const upsell = UPSELL_MESSAGES.quiz;
    return (
      <Card className="bg-gradient-to-br from-[hsl(var(--mn-accent)/0.06)] to-[#6366f1/0.06] border-[hsl(var(--mn-accent)/0.2)] dark:border-[hsl(var(--mn-accent)/0.3)]">
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--mn-accent))]" />
          <h3 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-2">
            {upsell.title}
          </h3>
          <p className="text-[hsl(var(--mn-muted))] mb-2 text-sm">
            {featureCheck.reason}
          </p>
          <p className="text-[hsl(var(--mn-muted))] mb-4 text-sm">
            {upsell.description}
          </p>
          <Button asChild className="bg-gradient-to-r from-[hsl(var(--mn-accent))] to-indigo-500 hover:from-[hsl(var(--mn-accent))] hover:to-indigo-600">
            <Link to={createPageUrl('Pricing')}>
              {upsell.cta}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!quizQuestions) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--mn-accent))]" />
          <h3 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-2">
            Hippo vytvoří kvíz
          </h3>
          <p className="text-[hsl(var(--mn-muted))] mb-4 text-sm">
            Hippo vygeneruje 5 MCQ otázek pro procvičení pochopení tématu.
          </p>
          <Button
            onClick={generateQuiz}
            disabled={isLoading}
            className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Generovat kvíz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-[hsl(var(--mn-accent)/0.2)] dark:border-[hsl(var(--mn-accent)/0.3)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
            <Badge className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]">
              MCQ Kvíz
            </Badge>
            <span className="text-xs text-[hsl(var(--mn-muted))]">
              {quizQuestions.length} otázek
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {quizQuestions.map((q, idx) => {
            const selected = selectedAnswers[idx];
            const isCorrect = selected === q.correct_answer;
            const showResult = selected !== undefined;

            return (
              <div key={idx} className="p-4 rounded-lg border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))]">
                <div className="font-semibold text-[hsl(var(--mn-text))] mb-3">
                  {idx + 1}. {q.question_text}
                </div>

                <div className="space-y-2 mb-3">
                  {['A', 'B', 'C', 'D'].map(option => {
                    const isSelected = selected === option;
                    const isCorrectOption = q.correct_answer === option;

                    let optionClass = 'p-3 rounded-lg border cursor-pointer transition-colors ';
                    if (showResult) {
                      if (isCorrectOption) {
                        optionClass += 'border-[hsl(var(--mn-success))] bg-[hsl(var(--mn-success)/0.06)]';
                      } else if (isSelected) {
                        optionClass += 'border-[hsl(var(--mn-danger))] bg-[hsl(var(--mn-danger)/0.06)]';
                      } else {
                        optionClass += 'border-[hsl(var(--mn-border))]';
                      }
                    } else {
                      optionClass += isSelected
                        ? 'border-[hsl(var(--mn-accent))] bg-[hsl(var(--mn-accent)/0.08)]'
                        : 'border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-accent)/0.4)]';
                    }

                    return (
                      <div
                        key={option}
                        className={optionClass}
                        onClick={() => !showResult && handleAnswer(idx, option)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{option})</span>
                          <span>{q.options[option]}</span>
                          {showResult && isCorrectOption && (
                            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--mn-success))] ml-auto" />
                          )}
                          {showResult && isSelected && !isCorrectOption && (
                            <AlertCircle className="w-4 h-4 text-[hsl(var(--mn-danger))] ml-auto" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {showResult && (
                  <div className={`p-3 rounded-lg text-sm ${isCorrect ? 'bg-[hsl(var(--mn-success)/0.06)] border border-[hsl(var(--mn-success)/0.3)]' : 'bg-[hsl(var(--mn-danger)/0.06)] border border-[hsl(var(--mn-danger)/0.3)]'}`}>
                    <div className="font-semibold mb-1">
                      {isCorrect ? '✅ Správně!' : '❌ Špatně'}
                    </div>
                    <div className="text-[hsl(var(--mn-muted))]">
                      <strong>Vysvětlení:</strong> {q.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}