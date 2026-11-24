const LESSONS = [
    {
        title: "Writing - Education (IELTS)",
        level: "B2",
        type: "Lesson plan",
        category: "Exam",
        description: "Interactive IELTS lesson exploring the education, learning how to reach 8.5 in writing task 2.",
        file: "lessons/IELTS_Writing_Task_2.html"
    },
    {
        title: "Wisdom Temple",
        level: "C1",
        type: "Lesson plan",
        category: "Culture & Trends",
        description: "Advanced C1 interactive lesson exploring philosophical concepts and rich vocabulary.",
        file: "lessons/Wisdom_Temple.html"
    },
    {
        title: "Great American Food Quest",
        level: "B1",
        type: "Vocabulary",
        category: "Daily Life",
        description: "A fun culinary journey exploring iconic American dishes and food vocabulary. Start the missions - collect your stamps",
        file: "lessons/great_american_food_quest.html"
    },
    {
        title: "Perfect Saturday",
        level: "A2",
        type: "Speaking",
        category: "Daily Life",
        description: "Talk about weekend routines, hobbies, and planning the ideal Saturday.",
        file: "lessons/perfect_saturday.html"
    },
    {
        title: "Family",
        level: "A1",
        type: "Lesson plan",
        category: "Daily Life",
        description: "Learn essential family member vocabulary and talk about your relatives.",
        file: "lessons/family.html"
    },
    {
        title: "Souvenirs",
        level: "A1",
        type: "Lesson plan",
        category: "Travel & Places",
        description: "Learn useful phrases and vocabulary to buy souvenirs when traveling abroad.",
        file: "lessons/Souvenir_Hunt.html"
    },
    {
        title: "Animals Little Wildlife Club",
        level: "A1",
        type: "Vocabulary",
        category: "Nature & Animals",
        description: "Discover wild animals, their habitats, and fun facts in an interactive wildlife club.",
        file: "lessons/Animals_Little_Wildlife_Club.html"
    },
    {
        title: "Just a Normal Day",
        level: "A1",
        type: "Listening",
        category: "Daily Life",
        description: "Practice listening comprehension with everyday routines, telling the time, and daily habits.",
        file: "lessons/just_a_normal_day.html"
    },
    {
        title: "The Working Life",
        level: "A1",
        type: "Vocabulary",
        category: "Work & Study",
        description: "Explore common jobs, workplaces, and basic phrases to describe what people do.",
        file: "lessons/the_working_life_jobs.html"
    },
    {
        title: "A Day in My Life",
        level: "A1",
        type: "Listening",
        category: "Daily Life",
        description: "Slow English podcast lesson to practice listening to daily schedules and simple activities.",
        file: "lessons/a_day_in_my_life_slow_english_podcast.html"
    },
    {
        title: "City Mouse & Country Mouse",
        level: "A1",
        type: "Listening",
        category: "Literature",
        description: "Discover a classic story comparing bustling city life and quiet countryside living through listening and reading tasks. Dive directly into the book!",
        file: "lessons/city_mouse_country_mouse.html"
    },
    {
        title: "Feelings & Emotions",
        level: "A1",
        type: "Vocabulary",
        category: "Health & Wellness",
        description: "Learn how to express moods, feelings, and emotions in everyday conversations.",
        file: "lessons/feelings_emotions.html"
    },
    {
        title: "Food & Drink",
        level: "A1",
        type: "Vocabulary",
        category: "Daily Life",
        description: "Essential vocabulary for meals, groceries, drinks, and practise with listening and reading activities",
        file: "lessons/food_drink.html"
    },
    {
        title: "Have to",
        level: "A1",
        type: "Grammar",
        category: "Daily Life",
        description: "Practice using 'have to' and 'don't have to', 'must' and 'mustn't' to talk about rules, obligations, and chores + revise usage of 'can'.",
        file: "lessons/have_to.html"
    },
    {
        title: "Here and There",
        level: "A1",
        type: "Grammar",
        category: "Daily Life",
        description: "Interactive practice contrasting Present Simple for routines and Present Continuous for actions happening now.",
        file: "lessons/here_and_there_present_simple_vs_present_continuous_interactive_lesson.html"
    },
    {
        title: "I Feel Sick",
        level: "A1",
        type: "Vocabulary",
        category: "Health & Wellness",
        description: "Learn common symptoms, illnesses, and how to talk to a doctor.",
        file: "lessons/medical_case_study.html"
    },
     {
        title: "Present Perfect vs. Past Simple",
        level: "B1",
        type: "Grammar",
        category: "Daily Life",
        description: "Master finished past events and life experiences with interactive dialogues, listening dictation, and practice.",
        files: {
            lesson: "lessons/present_perfect_vs_past_simple_lesson.html",
            practice: "lessons/present_perfect_vs_past_simple_practice.html",
            homework: "lessons/present_perfect_vs_past_simple_homework.html"
        }
    },
      {
        title: "Relationship",
        level: "A2",
        type: "Vocabulary",
        category: "Daily life",
        description: "Learn common phrasal verbs related to the relationship. Learn about question words and sunject/object questions.",
        files: {
         lesson:   "lessons/relationships.html",
            homework: "lessons/relationship_homework.html"
}
    },
    {
        title: "5 Days in Paris",
        level: "B1",
        type: "Lesson plan",
        category: "Travel & Places",
        description: "Explore a 5-day Paris itinerary, practise collocations with GO, role-play a tourist and blogger, and complete interactive reading tasks.",
        file: "lessons/five_days_in_paris.html"
    },
     {
        title: "AHS English B2 Interactive Mock Exam",
        level: "B2",
        type: "Lesson plan",
        category: "Exam",
        description: "Practice taking the B2-level test as in the real environment.",
        file: "lessons/AHS_English_B2_Interactive_Mock_Exam.html"
    },
    {
        title: "Main character energy",
        level: "B1",
        type: "Lesson plan",
        category: "Daily Life",
        description: "Explore aesthetic trends and social media culture at B1. Discover used to, would, be used to, and get used to.",
        file: "lessons/main_character_energy.html"
    },
      {
        title: "IELTS Listening & Grammar",
        level: "B2",
        type: "Lesson plan",
        category: "Exam",
        description: "Build B1-to-B2 IELTS Listening accuracy by spotting distractors, changed plans, and contrast cues (was going to, was supposed to, meant to, although, despite, whereas) across 90 minutes of guided practice, Part 2 & Part 3 simulations, and speaking tasks.",
        file: "lessons/ielts_listening.html"
    },
     {
        title: "Thrifting is a trend",
        level: "B1",
        type: "Lesson plan",
        category: "Culture & Trends",
        description: "Explore second-hand shopping, hidden market gems, and upcycling at A2–B1 level through a 60-minute interactive lesson with 10 vocabulary items, reading tasks, too vs. enough practice, two-speaker listening, and role-play.",
        file: "lessons/thrift_and_secondhand_finds.html"
    },
    {
    title: "The Fine Art of Pushing Back: Boundaries, Diplomacy & Difficult Conversations",
    level: "C1",
    type: "Lesson plan",
    category: "Communication & Work",
    description: "Practise C1 diplomacy, pushback, and boundary-setting through 10 high-nuance expressions, analytical reading, inversion and contrast structures, two-speaker listening, and negotiation role-plays.",
    file: "lessons/c1_art_of_pushing_back.html"
},
       {
        title: "Appearance",
        level: "A2",
        type: "Lesson plan",
        category: "Daily Life",
        description: "...",
        file: "lessons/Appearance.html"
    },
   {
    title: "IELTS Speaking",
    level: "B2",
    type: "Speaking",
    category: "Exam",
    description: "Practise IELTS Speaking with structured prompts, useful phrases, and exam tasks.",
    files: {
        student: "lessons/IELTS_Speaking_Student.html",
        teacher: "lessons/IELTS_Speaking_Teacher.html"
    }
},

     
];
