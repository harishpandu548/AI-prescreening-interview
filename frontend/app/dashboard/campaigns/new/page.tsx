"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { X, Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(3),
  jobRole: z.string().min(2, 'Job role is required for resume alignment checks'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  questionCount: z.number().min(1).max(20),
  timePerQuestion: z.number().min(30).max(600),
  requiredSkills: z.array(z.string()).min(1),
});

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      jobRole: "",
      difficulty: "INTERMEDIATE",
      questionCount: 5,
      timePerQuestion: 120,
      requiredSkills: [],
    },
  });

  const addSkill = () => {
    if (skillInput.trim()) {
      const currentSkills = form.getValues('requiredSkills');
      if (!currentSkills.includes(skillInput.trim())) {
        form.setValue('requiredSkills', [...currentSkills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    const currentSkills = form.getValues('requiredSkills');
    form.setValue('requiredSkills', currentSkills.filter(s => s !== skill));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await api.post('/campaigns', values);
      toast({ title: "Campaign Created", description: "Your new campaign is ready." });
      router.push('/dashboard/campaigns');
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to create campaign",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-neutral-900 border-neutral-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create New Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior Frontend Engineer" {...field} className="bg-neutral-800 border-neutral-700" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Role <span className="text-neutral-500 font-normal text-xs">(used for resume alignment check)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Full Stack Developer, Data Scientist" {...field} className="bg-neutral-800 border-neutral-700" />
                    </FormControl>
                    <FormDescription className="text-neutral-500">AI will verify uploaded resumes match this role before generating interview questions.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700">
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                          <SelectItem value="BEGINNER">Beginner</SelectItem>
                          <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                          <SelectItem value="ADVANCED">Advanced</SelectItem>
                          <SelectItem value="EXPERT">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="questionCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Questions</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="bg-neutral-800 border-neutral-700" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="timePerQuestion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time per Question (seconds)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-neutral-800 border-neutral-700" 
                      />
                    </FormControl>
                    <FormDescription className="text-neutral-500">
                      Candidates will have this much time to answer each question.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Required Skills</FormLabel>
                <div className="flex gap-2">
                  <Input 
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="e.g. React, Node.js" 
                    className="bg-neutral-800 border-neutral-700" 
                  />
                  <Button type="button" onClick={addSkill} variant="secondary">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.watch('requiredSkills').map((skill) => (
                    <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-full text-sm">
                      {skill}
                      <X size={14} className="cursor-pointer hover:text-white" onClick={() => removeSkill(skill)} />
                    </span>
                  ))}
                </div>
                <FormMessage>{form.formState.errors.requiredSkills?.message}</FormMessage>
              </FormItem>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8 h-11" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                       <Loader2 className="h-4 w-4 animate-spin" />
                       <span>Creating...</span>
                    </div>
                  ) : "Create Campaign"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
