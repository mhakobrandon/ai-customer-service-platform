"""
Model Training Pipeline for Multilingual Intent Classification
Uses XLM-RoBERTa for English, Shona, and Ndebele customer service queries.

Author: Brandon K Mhako (R223931W)
"""

import json
import os
import logging
from typing import List, Dict, Tuple, Optional
from datetime import datetime

from app.services.intent_catalog import INTENT_LABELS, normalize_intent

# ML Libraries
try:
    import torch
    from torch.utils.data import Dataset, DataLoader
    from transformers import (
        AutoTokenizer,
        AutoModelForSequenceClassification,
        TrainingArguments,
        Trainer,
        EarlyStoppingCallback
    )
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
    import numpy as np
    ML_AVAILABLE = True
except ImportError as e:
    ML_AVAILABLE = False
    print(f"ML libraries not available: {e}")
    print("Install with: pip install torch transformers scikit-learn")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Re-exported for backward compatibility with existing imports.

# Training data - Multilingual examples (English, Shona, Ndebele)
TRAINING_DATA = [
    # Balance Inquiry - English
    {"text": "What is my account balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "How much money do I have?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Check my balance please", "intent": "balance_inquiry", "language": "en"},
    {"text": "Can you tell me my current balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "I want to know my account balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "Show me my balance", "intent": "balance_inquiry", "language": "en"},
    {"text": "What's my available balance?", "intent": "balance_inquiry", "language": "en"},
    {"text": "Balance inquiry", "intent": "balance_inquiry", "language": "en"},
    
    # Balance Inquiry - Shona
    {"text": "Mari yangu yakamira sei?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndine mari yakawanda sei?", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Ndinoda kuziva mari yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Tarisa mari yangu", "intent": "balance_inquiry", "language": "sn"},
    {"text": "Balance yangu ndeipi?", "intent": "balance_inquiry", "language": "sn"},
    
    # Balance Inquiry - Ndebele
    {"text": "Imali yami ingakanani?", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Ngifuna ukwazi imali yami", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Khangela imali yami", "intent": "balance_inquiry", "language": "nd"},
    {"text": "Nginemali engakanani?", "intent": "balance_inquiry", "language": "nd"},
    
    # Transaction History - English
    {"text": "Show me my recent transactions", "intent": "transaction_history", "language": "en"},
    {"text": "What are my last transactions?", "intent": "transaction_history", "language": "en"},
    {"text": "Transaction history please", "intent": "transaction_history", "language": "en"},
    {"text": "I want to see my transactions", "intent": "transaction_history", "language": "en"},
    {"text": "List my recent payments", "intent": "transaction_history", "language": "en"},
    {"text": "Show me what I spent this month", "intent": "transaction_history", "language": "en"},
    
    # Transaction History - Shona
    {"text": "Ndipewo zvandakamboita", "intent": "transaction_history", "language": "sn"},
    {"text": "Ndinoda kuona transactions dzangu", "intent": "transaction_history", "language": "sn"},
    {"text": "Zvandakabhadhara ndezvipi?", "intent": "transaction_history", "language": "sn"},
    
    # Transaction History - Ndebele
    {"text": "Ngitshengise imisebenzi yami", "intent": "transaction_history", "language": "nd"},
    {"text": "Ngifuna ukubona i-transactions zami", "intent": "transaction_history", "language": "nd"},
    
    # Transfer Money - English
    {"text": "I want to transfer money", "intent": "transfer_money", "language": "en"},
    {"text": "Send money to another account", "intent": "transfer_money", "language": "en"},
    {"text": "How do I transfer funds?", "intent": "transfer_money", "language": "en"},
    {"text": "Transfer $100 to John", "intent": "transfer_money", "language": "en"},
    {"text": "I need to send money to my friend", "intent": "transfer_money", "language": "en"},
    {"text": "Make a transfer please", "intent": "transfer_money", "language": "en"},
    
    # Transfer Money - Shona
    {"text": "Ndinoda kutumira mari", "intent": "transfer_money", "language": "sn"},
    {"text": "Tumira mari kuna John", "intent": "transfer_money", "language": "sn"},
    {"text": "Ndingatumira mari sei?", "intent": "transfer_money", "language": "sn"},
    
    # Transfer Money - Ndebele
    {"text": "Ngifuna ukuthumela imali", "intent": "transfer_money", "language": "nd"},
    {"text": "Thumela imali ku-John", "intent": "transfer_money", "language": "nd"},
    
    # Password Reset - English
    {"text": "I forgot my password", "intent": "password_reset", "language": "en"},
    {"text": "Reset my password please", "intent": "password_reset", "language": "en"},
    {"text": "I can't remember my password", "intent": "password_reset", "language": "en"},
    {"text": "Help me reset my password", "intent": "password_reset", "language": "en"},
    {"text": "Change my password", "intent": "password_reset", "language": "en"},
    {"text": "I need a new password", "intent": "password_reset", "language": "en"},
    
    # Password Reset - Shona
    {"text": "Ndakanganwa password yangu", "intent": "password_reset", "language": "sn"},
    {"text": "Ndibatsireiwo kuchinja password", "intent": "password_reset", "language": "sn"},
    {"text": "Ndinoda password itsva", "intent": "password_reset", "language": "sn"},
    
    # Password Reset - Ndebele
    {"text": "Ngilibele i-password yami", "intent": "password_reset", "language": "nd"},
    {"text": "Ngicela ukutshintsha i-password", "intent": "password_reset", "language": "nd"},
    
    # Loan Inquiry - English
    {"text": "I want to apply for a loan", "intent": "loan_inquiry", "language": "en"},
    {"text": "What loans do you offer?", "intent": "loan_inquiry", "language": "en"},
    {"text": "Can I get a personal loan?", "intent": "loan_inquiry", "language": "en"},
    {"text": "Tell me about your loan products", "intent": "loan_inquiry", "language": "en"},
    {"text": "I need to borrow money", "intent": "loan_inquiry", "language": "en"},
    {"text": "What are your interest rates for loans?", "intent": "loan_inquiry", "language": "en"},
    
    # Loan Inquiry - Shona
    {"text": "Ndinoda kukwereta mari", "intent": "loan_inquiry", "language": "sn"},
    {"text": "Mune maloan api?", "intent": "loan_inquiry", "language": "sn"},
    {"text": "Ndingawana chikwereti here?", "intent": "loan_inquiry", "language": "sn"},
    
    # Loan Inquiry - Ndebele
    {"text": "Ngifuna ukuboleka imali", "intent": "loan_inquiry", "language": "nd"},
    {"text": "Liliphi imalimboleko elikhona?", "intent": "loan_inquiry", "language": "nd"},
    
    # Bill Payment - English
    {"text": "I want to pay my bills", "intent": "bill_payment", "language": "en"},
    {"text": "Pay electricity bill", "intent": "bill_payment", "language": "en"},
    {"text": "How do I pay for utilities?", "intent": "bill_payment", "language": "en"},
    {"text": "Pay my water bill please", "intent": "bill_payment", "language": "en"},
    {"text": "I need to pay ZESA", "intent": "bill_payment", "language": "en"},
    
    # Bill Payment - Shona
    {"text": "Ndinoda kubhadhara mabhiri", "intent": "bill_payment", "language": "sn"},
    {"text": "Bhadhara magetsi", "intent": "bill_payment", "language": "sn"},
    {"text": "Ndibatsireiwo kubhadhara mvura", "intent": "bill_payment", "language": "sn"},
    
    # Bill Payment - Ndebele
    {"text": "Ngifuna ukukhokhela izindleko", "intent": "bill_payment", "language": "nd"},
    {"text": "Khokhela ugesi", "intent": "bill_payment", "language": "nd"},
    
    # Mobile Money - English
    {"text": "Send to EcoCash", "intent": "mobile_money", "language": "en"},
    {"text": "Transfer to mobile money", "intent": "mobile_money", "language": "en"},
    {"text": "I want to cash out", "intent": "mobile_money", "language": "en"},
    {"text": "Send money to my EcoCash wallet", "intent": "mobile_money", "language": "en"},
    {"text": "OneMoney transfer", "intent": "mobile_money", "language": "en"},
    
    # Mobile Money - Shona
    {"text": "Tumira kuEcoCash", "intent": "mobile_money", "language": "sn"},
    {"text": "Ndinoda kutumira mari kuEcoCash", "intent": "mobile_money", "language": "sn"},
    
    # Account Statement - English
    {"text": "I need my bank statement", "intent": "account_statement", "language": "en"},
    {"text": "Send me my statement", "intent": "account_statement", "language": "en"},
    {"text": "Can I get a mini statement?", "intent": "account_statement", "language": "en"},
    {"text": "Email my bank statement", "intent": "account_statement", "language": "en"},
    
    # Account Statement - Shona
    {"text": "Ndinoda statement yangu", "intent": "account_statement", "language": "sn"},
    {"text": "Ndipeiwo bank statement", "intent": "account_statement", "language": "sn"},
    
    # Transaction Dispute - English
    {"text": "I see a wrong transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "There's an unauthorized charge", "intent": "transaction_dispute", "language": "en"},
    {"text": "I didn't make this transaction", "intent": "transaction_dispute", "language": "en"},
    {"text": "I want to dispute a charge", "intent": "transaction_dispute", "language": "en"},
    {"text": "Someone stole money from my account", "intent": "transaction_dispute", "language": "en"},
    
    # Transaction Dispute - Shona
    {"text": "Pane transaction isiri yangu", "intent": "transaction_dispute", "language": "sn"},
    {"text": "Mari yangu yabiwa", "intent": "transaction_dispute", "language": "sn"},
    
    # New Account - English
    {"text": "I want to open a new account", "intent": "account_opening", "language": "en"},
    {"text": "How do I create an account?", "intent": "account_opening", "language": "en"},
    {"text": "Open a savings account for me", "intent": "account_opening", "language": "en"},
    {"text": "What documents do I need for a new account?", "intent": "account_opening", "language": "en"},
    
    # New Account - Shona
    {"text": "Ndinoda kuvhura account", "intent": "account_opening", "language": "sn"},
    {"text": "Ndingavhura account sei?", "intent": "account_opening", "language": "sn"},
    
    # Card Request - English
    {"text": "I need a new debit card", "intent": "card_request", "language": "en"},
    {"text": "My card is lost", "intent": "card_request", "language": "en"},
    {"text": "Request a replacement card", "intent": "card_request", "language": "en"},
    {"text": "I want to apply for a credit card", "intent": "card_request", "language": "en"},
    {"text": "Block my card", "intent": "card_request", "language": "en"},
    
    # Card Request - Shona
    {"text": "Ndinoda kadhi idzva", "intent": "card_request", "language": "sn"},
    {"text": "Kadhi yangu yarasika", "intent": "card_request", "language": "sn"},
    
    # ATM Location - English
    {"text": "Where is the nearest ATM?", "intent": "atm_location", "language": "en"},
    {"text": "Find ATM near me", "intent": "atm_location", "language": "en"},
    {"text": "ATM locations in Harare", "intent": "atm_location", "language": "en"},
    {"text": "Where can I withdraw cash?", "intent": "atm_location", "language": "en"},
    
    # ATM Location - Shona
    {"text": "ATM iri pedyo ndeipi?", "intent": "atm_location", "language": "sn"},
    {"text": "Ndingawana ATM kupi?", "intent": "atm_location", "language": "sn"},
    
    # Greeting - English
    {"text": "Hello", "intent": "greeting", "language": "en"},
    {"text": "Hi there", "intent": "greeting", "language": "en"},
    {"text": "Good morning", "intent": "greeting", "language": "en"},
    {"text": "Hey", "intent": "greeting", "language": "en"},
    
    # Greeting - Shona
    {"text": "Mhoro", "intent": "greeting", "language": "sn"},
    {"text": "Makadii", "intent": "greeting", "language": "sn"},
    {"text": "Masikati", "intent": "greeting", "language": "sn"},
    
    # Greeting - Ndebele
    {"text": "Sawubona", "intent": "greeting", "language": "nd"},
    {"text": "Salibonani", "intent": "greeting", "language": "nd"},
    
    # Goodbye - English
    {"text": "Goodbye", "intent": "goodbye", "language": "en"},
    {"text": "Thank you, bye", "intent": "goodbye", "language": "en"},
    {"text": "That's all, thanks", "intent": "goodbye", "language": "en"},
    {"text": "See you later", "intent": "goodbye", "language": "en"},
    
    # Goodbye - Shona
    {"text": "Chisarai zvakanaka", "intent": "goodbye", "language": "sn"},
    {"text": "Maita basa", "intent": "goodbye", "language": "sn"},
    {"text": "Ndatenda", "intent": "goodbye", "language": "sn"},
    
    # Goodbye - Ndebele
    {"text": "Sala kahle", "intent": "goodbye", "language": "nd"},
    {"text": "Ngiyabonga", "intent": "goodbye", "language": "nd"},
    
    # Complaint - English
    {"text": "I want to make a complaint", "intent": "complaint", "language": "en"},
    {"text": "Your service is terrible", "intent": "complaint", "language": "en"},
    {"text": "I'm not happy with the service", "intent": "complaint", "language": "en"},
    {"text": "I need to speak to a manager", "intent": "complaint", "language": "en"},
    {"text": "This is unacceptable", "intent": "complaint", "language": "en"},
    
    # Complaint - Shona
    {"text": "Handina kufara neservice yenyu", "intent": "complaint", "language": "sn"},
    {"text": "Ndinoda kutaura namanager", "intent": "complaint", "language": "sn"},
    
    # General Inquiry - English
    {"text": "I have a question", "intent": "general_inquiry", "language": "en"},
    {"text": "Can you help me?", "intent": "general_inquiry", "language": "en"},
    {"text": "I need some information", "intent": "general_inquiry", "language": "en"},
    {"text": "What services do you offer?", "intent": "general_inquiry", "language": "en"},
    
    # General Inquiry - Shona
    {"text": "Ndinoda rubatsiro", "intent": "general_inquiry", "language": "sn"},
    {"text": "Ndine mubvunzo", "intent": "general_inquiry", "language": "sn"},
    
    # General Inquiry - Ndebele
    {"text": "Ngicela usizo", "intent": "general_inquiry", "language": "nd"},
    {"text": "Ngilombuzo", "intent": "general_inquiry", "language": "nd"},
]


class IntentDataset(Dataset):
    """PyTorch Dataset for intent classification"""
    
    def __init__(self, texts: List[str], labels: List[int], tokenizer, max_length: int = 128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }


class ModelTrainer:
    """Handles model training and evaluation"""
    
    def __init__(
        self,
        model_name: str = "xlm-roberta-base",
        output_dir: str = "./trained_model",
        num_labels: int = len(INTENT_LABELS)
    ):
        self.model_name = model_name
        self.output_dir = output_dir
        self.num_labels = num_labels
        self.label2id = {label: idx for idx, label in enumerate(INTENT_LABELS)}
        self.id2label = {idx: label for idx, label in enumerate(INTENT_LABELS)}
        
        if not ML_AVAILABLE:
            raise RuntimeError("ML libraries not installed. Run: pip install torch transformers scikit-learn")
        
        logger.info(f"Initializing ModelTrainer with {model_name}")
        logger.info(f"Number of intent labels: {num_labels}")
        
        # Initialize tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_labels,
            id2label=self.id2label,
            label2id=self.label2id
        )
        
        # Check for GPU
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        self.model.to(self.device)
    
    def prepare_data(
        self,
        data: List[Dict] = None,
        test_size: float = 0.2
    ) -> Tuple[Dataset, Dataset]:
        """Prepare training and validation datasets"""
        
        if data is None:
            data = TRAINING_DATA
        
        texts = [item["text"] for item in data]
        labels = [self.label2id[item["intent"]] for item in data]
        
        # Split data
        train_texts, val_texts, train_labels, val_labels = train_test_split(
            texts, labels, test_size=test_size, random_state=42, stratify=labels
        )
        
        logger.info(f"Training samples: {len(train_texts)}")
        logger.info(f"Validation samples: {len(val_texts)}")
        
        train_dataset = IntentDataset(train_texts, train_labels, self.tokenizer)
        val_dataset = IntentDataset(val_texts, val_labels, self.tokenizer)
        
        return train_dataset, val_dataset
    
    def compute_metrics(self, eval_pred):
        """Compute evaluation metrics"""
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=1)
        
        accuracy = accuracy_score(labels, predictions)
        precision, recall, f1, _ = precision_recall_fscore_support(
            labels, predictions, average='weighted'
        )
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1
        }
    
    def train(
        self,
        train_dataset: Dataset,
        val_dataset: Dataset,
        epochs: float = 5,
        batch_size: int = 16,
        learning_rate: float = 2e-5,
        warmup_steps: int = 100
    ):
        """Train the model"""
        
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            warmup_steps=warmup_steps,
            weight_decay=0.01,
            logging_dir=f"{self.output_dir}/logs",
            logging_steps=10,
            eval_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            learning_rate=learning_rate,
            report_to="none"  # Disable wandb/tensorboard for simplicity
        )
        
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            compute_metrics=self.compute_metrics,
            callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
        )
        
        logger.info("Starting training...")
        start_time = datetime.now()
        
        trainer.train()
        
        training_time = datetime.now() - start_time
        logger.info(f"Training completed in {training_time}")
        
        # Save the model with retry logic for Windows file locking issues
        import gc
        import time
        
        # Force garbage collection to release any file handles
        gc.collect()
        
        max_retries = 5
        for attempt in range(max_retries):
            try:
                # Small delay to allow file handles to be released
                time.sleep(2)
                self.model.save_pretrained(self.output_dir, safe_serialization=True)
                self.tokenizer.save_pretrained(self.output_dir)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Save attempt {attempt + 1} failed: {e}. Retrying...")
                    gc.collect()
                    time.sleep(3)
                else:
                    # Try saving without safe tensors as fallback
                    logger.warning(f"Safe serialization failed, trying pickle format...")
                    try:
                        self.model.save_pretrained(self.output_dir, safe_serialization=False)
                        self.tokenizer.save_pretrained(self.output_dir)
                    except Exception as e2:
                        logger.error(f"Final save attempt failed: {e2}")
                        raise
        
        # Save label mappings
        with open(f"{self.output_dir}/label_mappings.json", "w") as f:
            json.dump({
                "label2id": self.label2id,
                "id2label": self.id2label
            }, f, indent=2)
        
        logger.info(f"Model saved to {self.output_dir}")
        
        return trainer
    
    def evaluate(self, trainer, test_dataset: Dataset = None):
        """Evaluate the model"""
        if test_dataset is None:
            test_dataset = trainer.eval_dataset
        
        results = trainer.evaluate(test_dataset)
        logger.info(f"Evaluation results: {results}")
        
        return results
    
    def predict(self, text: str) -> Dict:
        """Make a prediction on a single text"""
        self.model.eval()
        
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=128,
            return_tensors='pt'
        )
        
        encoding = {k: v.to(self.device) for k, v in encoding.items()}
        
        with torch.no_grad():
            outputs = self.model(**encoding)
            probabilities = torch.softmax(outputs.logits, dim=1)
            confidence, predicted_class = torch.max(probabilities, dim=1)
        
        intent = self.id2label[predicted_class.item()]
        
        return {
            "text": text,
            "intent": intent,
            "confidence": confidence.item(),
            "all_probabilities": {
                self.id2label[i]: prob.item()
                for i, prob in enumerate(probabilities[0])
            }
        }


def train_model(
    model_name: str = "xlm-roberta-base",
    output_dir: str = "./trained_model",
    epochs: float = 5,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
    training_data: List[Dict] = None
):
    """Main training function"""
    
    if not ML_AVAILABLE:
        print("=" * 60)
        print("ML LIBRARIES NOT INSTALLED")
        print("=" * 60)
        print("\nPlease install the required libraries:")
        print("\n  pip install torch transformers scikit-learn")
        print("\nOr for GPU support (NVIDIA):")
        print("\n  pip install torch --index-url https://download.pytorch.org/whl/cu118")
        print("  pip install transformers scikit-learn")
        print("=" * 60)
        return None
    
    # Use provided training data or default, then normalize aliases
    source_data = training_data if training_data is not None else TRAINING_DATA
    data: List[Dict] = []
    for item in source_data:
        normalized_intent = normalize_intent(item.get("intent", ""))
        if normalized_intent not in INTENT_LABELS:
            continue
        data.append(
            {
                "text": item.get("text", ""),
                "intent": normalized_intent,
                "language": item.get("language", "en"),
            }
        )
    
    print("=" * 60)
    print("MULTILINGUAL INTENT CLASSIFICATION MODEL TRAINING")
    print("=" * 60)
    print(f"\nModel: {model_name}")
    print(f"Languages: English, Shona, Ndebele")
    print(f"Intent Categories: {len(INTENT_LABELS)}")
    print(f"Training Samples: {len(data)}")
    print(f"Epochs: {epochs}")
    print(f"Batch Size: {batch_size}")
    print(f"Learning Rate: {learning_rate}")
    print("=" * 60)
    
    # Initialize trainer
    trainer = ModelTrainer(model_name=model_name, output_dir=output_dir)
    
    # Prepare data
    train_dataset, val_dataset = trainer.prepare_data(data=data)
    
    # Train
    huggingface_trainer = trainer.train(
        train_dataset=train_dataset,
        val_dataset=val_dataset,
        epochs=epochs,
        batch_size=batch_size,
        learning_rate=learning_rate
    )
    
    # Evaluate
    results = trainer.evaluate(huggingface_trainer)
    
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)
    print(f"\nFinal Metrics:")
    print(f"  Accuracy:  {results['eval_accuracy']:.4f}")
    print(f"  Precision: {results['eval_precision']:.4f}")
    print(f"  Recall:    {results['eval_recall']:.4f}")
    print(f"  F1 Score:  {results['eval_f1']:.4f}")
    print(f"\nModel saved to: {output_dir}")
    print("=" * 60)
    
    # Test predictions
    print("\nTest Predictions:")
    print("-" * 40)
    test_texts = [
        "What is my balance?",
        "Mari yangu yakamira sei?",
        "Ngifuna ukuthumela imali",
        "I forgot my password",
        "Mhoro",
    ]
    
    for text in test_texts:
        result = trainer.predict(text)
        print(f"  '{text}'")
        print(f"    → Intent: {result['intent']} (confidence: {result['confidence']:.2%})")
    
    return trainer


if __name__ == "__main__":
    # Combine all training data sources for comprehensive coverage
    from app.services.expanded_training_data import EXPANDED_TRAINING_DATA
    from app.services.additional_training_data import ADDITIONAL_TRAINING_DATA
    
    # Merge all training data
    all_training_data = EXPANDED_TRAINING_DATA + ADDITIONAL_TRAINING_DATA
    
    # Remove duplicates based on text
    seen_texts = set()
    unique_data = []
    for item in all_training_data:
        if item["text"].lower() not in seen_texts:
            seen_texts.add(item["text"].lower())
            unique_data.append(item)
    
    print(f"\nTotal unique training samples: {len(unique_data)}")
    
    train_model(
        output_dir="./trained_model",
        epochs=15,  # More epochs for larger dataset
        batch_size=16,  # Larger batch for more stable training
        learning_rate=2e-5,  # Standard learning rate for fine-tuning
        training_data=unique_data
    )
